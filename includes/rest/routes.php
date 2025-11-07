<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/db.php';
require_once GSTORE_EPP_DIR.'includes/common/parse.php';

class GStore_EPP_REST {
	const NS = 'gstore/v1';

	public function __construct(){
		add_action('rest_api_init', [$this,'routes']);
	}

	public function routes(){

		// Laptop add-ons
		register_rest_route(self::NS, '/laptop-addons', [
			'methods' => 'GET',
			'callback' => [$this,'get_laptop_addons'],
			'permission_callback' => '__return_true'
		]);

		// Compare specs
		register_rest_route(self::NS, '/compare-specs', [
			'methods' => 'GET',
			'permission_callback' => '__return_true',
			'callback' => [$this,'get_compare_specs'],
			'args' => [
				'product_id'=> ['required'=>true,'type'=>'integer']
			]
		]);

		// Product search
		register_rest_route(self::NS, '/products-search', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'search_products'],
			'args'=>[
				'search'=>['required'=>false,'type'=>'string'],
				'limit'=>['required'=>false,'type'=>'integer','default'=>20]
			]
		]);

		// Pricing - NOW STORAGE-SPECIFIC
		register_rest_route(self::NS, '/pricing', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_pricing'],
			'args'=>[
				'product_id'=>['required'=>true,'type'=>'integer']
			]
		]);

		// Siblings (OPTIMIZED WITH PROPER CACHING)
		register_rest_route(self::NS, '/siblings', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_siblings_optimized'],
			'args'=>[
				'product_id'=>['required'=>true,'type'=>'integer']
			]
		]);

		// Warranty
		register_rest_route(self::NS, '/warranty', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_warranty'],
			'args'=>[
				'product_id'=>['required'=>true,'type'=>'integer']
			]
		]);

		// Frequently Bought Together (FBT)
		register_rest_route(self::NS, '/fbt', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_fbt'],
			'args'=>[
				'product_id'=>['required'=>true,'type'=>'integer']
			]
		]);
	}

	/* -------------------------
		PRICING - NOW STORAGE-SPECIFIC
	--------------------------*/
	public function get_pricing(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		// Check cache first
		$cache_key = 'gstore_pricing_' . $pid;
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			gstore_log_debug('pricing_cache_hit', ['pid'=>$pid]);
			return new WP_REST_Response($cached, 200);
		}

		$ctx = gstore_epp_parse_by_product_id($pid);

		// Include storage in the key
		$storage = $ctx['storage'] ?: '';
		$storage_normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $storage));

		// Build storage-specific group key
		$group_key = $ctx['group_key']; // e.g., "apple iphone-14-pro"
		$group_key_with_storage = $group_key;
		if ($storage_normalized) {
			$group_key_with_storage = $group_key . ' ' . $storage_normalized; // e.g., "apple iphone-14-pro 128gb"
		}

		global $wpdb;

		// Try to find storage-specific rule first
		$row = null;
		if ($storage_normalized) {
			$row = $wpdb->get_row(
				$wpdb->prepare("SELECT * FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1", $group_key_with_storage),
				ARRAY_A
			);
		}

		// Fallback to model-level rule if no storage-specific rule found
		if (!$row) {
			$row = $wpdb->get_row(
				$wpdb->prepare("SELECT * FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1", $group_key),
				ARRAY_A
			);
		}

		if (!$row){
			$result = [
				'ok'=>true,
				'exists'=>false,
				'device_type'=>$ctx['device_type'],
				'group_key'=>$group_key,
				'storage'=>$storage,
				'pricing'=>[]
			];

			// Cache for 1 hour
			set_transient($cache_key, $result, HOUR_IN_SECONDS);

			return new WP_REST_Response($result, 200);
		}

		$pricing = $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];

		$result = [
			'ok'=>true,
			'exists'=>true,
			'device_type'=>$row['device_type'],
			'group_key'=>$row['group_key'],
			'storage'=>$storage,
			'default_condition'=>$row['default_condition'],
			'pricing'=>$pricing
		];

		// Cache for 1 hour
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		gstore_log_debug('pricing_resolved', [
			'pid'=>$pid,
			'group_key'=>$row['group_key'],
			'storage'=>$storage,
			'has_pricing'=>!empty($pricing)
		]);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		SIBLINGS - FULLY OPTIMIZED WITH PROPER CONDITION MATCHING
	--------------------------*/
	public function get_siblings_optimized(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		// CHECK CACHE FIRST (1 hour)
		$cache_key = 'gstore_siblings_' . $pid;
		$cached = get_transient($cache_key);

		if ($cached !== false) {
			gstore_log_debug('siblings_cache_hit', ['pid'=>$pid]);
			return new WP_REST_Response($cached, 200);
		}

		$ctx = gstore_epp_parse_by_product_id($pid);

		$brand = $ctx['brand'];
		$model = $ctx['model'];
		$group_key = $ctx['group_key'];

		// If no model, can't find siblings
		if (!$model){
			gstore_log_error('siblings_no_model', ['pid'=>$pid,'ctx'=>$ctx]);
			$result = ['ok'=>false,'error'=>'MODEL_REQUIRED','debug'=>$ctx];
			set_transient($cache_key, $result, HOUR_IN_SECONDS);
			return new WP_REST_Response($result, 200);
		}

		if (!$group_key) {
			gstore_log_error('siblings_no_group_key', ['pid'=>$pid,'ctx'=>$ctx]);
			$result = ['ok'=>false,'error'=>'GROUP_KEY_REQUIRED'];
			set_transient($cache_key, $result, HOUR_IN_SECONDS);
			return new WP_REST_Response($result, 200);
		}

		// OPTIMIZED: Use direct database query instead of WP_Query
		global $wpdb;

		// Get all products with matching model attribute (limit 200 for safety)
		$model_slug = sanitize_title($model);

		$sql = "
			SELECT DISTINCT p.ID 
			FROM {$wpdb->posts} p
			INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
			INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
			INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
			WHERE p.post_type = 'product'
			AND p.post_status = 'publish'
			AND tt.taxonomy = 'pa_model'
			AND t.slug = %s
			LIMIT 200
		";

		$product_ids = $wpdb->get_col($wpdb->prepare($sql, $model_slug));

		// If no results from taxonomy, try meta query (fallback)
		if (empty($product_ids)) {
			$sql = "
				SELECT DISTINCT p.ID
				FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
				WHERE p.post_type = 'product'
				AND p.post_status = 'publish'
				AND pm.meta_key = 'attribute_pa_model'
				AND pm.meta_value = %s
				LIMIT 200
			";

			$product_ids = $wpdb->get_col($wpdb->prepare($sql, $model_slug));
		}

		$items = [];

		if (!empty($product_ids)){
			foreach($product_ids as $id){
				$p_model = gstore_epp_attr($id, 'model');

				// Match by model (case-insensitive)
				if (strcasecmp($p_model, $model) === 0){
					$ip = wc_get_product($id);
					if (!$ip) continue;

					$img_id = $ip->get_image_id();
					$hero = $img_id ? wp_get_attachment_image_url($img_id, 'large') : wc_placeholder_img_src('large');

					// CRITICAL: Get raw condition attribute and normalize it
					$raw_condition = gstore_epp_attr($ip->get_id(),'condition');

					// Normalize condition for comparison
					// "USED (A)" or "used_a" or "used-a" → "used"
					// "NEW" → "new"
					// "OPEN BOX" or "open_box" → "openbox"
					$normalized_condition = strtolower(str_replace([' ', '(', ')', '-', '_'], '', $raw_condition));

					// Map variations to standard names
					if (strpos($normalized_condition, 'used') !== false) {
						$normalized_condition = 'used';
					} elseif (strpos($normalized_condition, 'new') !== false) {
						$normalized_condition = 'new';
					} elseif (strpos($normalized_condition, 'open') !== false) {
						$normalized_condition = 'openbox';
					}

					$items[] = [
						'id'=>$ip->get_id(),
						'title'=>$ip->get_title(),
						'permalink'=>get_permalink($ip->get_id()),
						'price'=>$ip->get_price(),
						'regular'=>$ip->get_regular_price(),
						'sale'=>$ip->get_sale_price(),
						'condition'=>$normalized_condition, // Store normalized condition
						'condition_raw'=>$raw_condition, // Keep original for display
						'brand'=>gstore_epp_attr($ip->get_id(),'brand'),
						'model'=>$p_model,
						'storage'=>gstore_epp_attr($ip->get_id(),'storage'),
						'color'=>gstore_epp_attr($ip->get_id(),'color'),
						'image'=>$hero
					];
				}
			}
		}

		$result = [
			'ok'=>true,
			'brand'=>$brand,
			'model'=>$model,
			'siblings'=>$items,
			'count'=>count($items)
		];

		// CACHE FOR 1 HOUR
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		gstore_log_debug('siblings_found', [
			'pid'=>$pid,
			'model'=>$model,
			'count'=>count($items),
			'cached'=>true
		]);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		COMPARE SPECS
	--------------------------*/
	public function get_compare_specs(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		// Check cache
		$cache_key = 'gstore_compare_specs_' . $pid;
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			return new WP_REST_Response($cached, 200);
		}

		$specs = get_post_meta($pid, '_gstore_compare_specs', true);

		if (!is_array($specs)) {
			$specs = [
				'CPU'=>0,
				'GPU'=>0,
				'Camera'=>0,
				'Battery'=>0,
				'Display'=>0,
				'Build'=>0,
				'Connectivity'=>0,
				'Charging'=>0,
				'Weight'=>0,
				'Durability'=>0,
				'Storage Speed'=>0,
				'Thermals'=>0
			];
		}

		$product = wc_get_product($pid);
		$title = $product ? $product->get_title() : 'Product';

		$result = [
			'ok'=>true,
			'product_id'=>$pid,
			'title'=>$title,
			'specs'=>$specs
		];

		// Cache for 1 hour
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		SEARCH PRODUCTS
	--------------------------*/
	public function search_products(WP_REST_Request $r){
		$search = sanitize_text_field($r->get_param('search') ?: '');
		$limit  = absint($r->get_param('limit') ?: 20);

		// Cache search results
		$cache_key = 'gstore_search_' . md5($search . $limit);
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			return new WP_REST_Response($cached, 200);
		}

		$args = [
			'post_type'=>'product',
			'posts_per_page'=>$limit,
			'post_status'=>'publish',
			'orderby'=>'title',
			'order'=>'ASC',
			'fields'=>'ids'
		];

		if ($search) $args['s'] = $search;

		$q = new WP_Query($args);
		$products = [];

		foreach($q->posts as $id){
			$p = wc_get_product($id);
			if (!$p) continue;

			$img_id = $p->get_image_id();
			$thumb = $img_id ? wp_get_attachment_image_url($img_id, 'thumbnail') : wc_placeholder_img_src('thumbnail');

			$products[] = [
				'id'=>$p->get_id(),
				'title'=>$p->get_title(),
				'image'=>$thumb
			];
		}

		wp_reset_postdata();

		$result = ['ok'=>true,'products'=>$products];

		// Cache for 30 minutes
		set_transient($cache_key, $result, 30 * MINUTE_IN_SECONDS);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		FBT (WITH CACHING)
	--------------------------*/
	public function get_fbt(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		// Check cache
		$cache_key = 'gstore_fbt_' . $pid;
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			gstore_log_debug('fbt_cache_hit', ['pid'=>$pid]);
			return new WP_REST_Response($cached, 200);
		}

		$ids = get_post_meta($pid, '_gstore_fbt_ids', true);
		if (!is_array($ids)) $ids = [];
		$ids = array_filter(array_map('absint', $ids));

		// If empty, fallback
		if (empty($ids)){
			$ctx = gstore_epp_parse_by_product_id($pid);
			if ($ctx && $ctx['group_key']){
				$q = new WP_Query([
					'post_type'=>'product',
					'posts_per_page'=>1,
					'post_status'=>'publish',
					'meta_query'=>[
						['key'=>'_gstore_is_group_default','value'=>'yes']
					],
					'fields'=>'ids'
				]);

				if ($q->have_posts()){
					$default_id = $q->posts[0];
					$ids = get_post_meta($default_id, '_gstore_fbt_ids', true);
					if (!is_array($ids)) $ids = [];
					$ids = array_filter(array_map('absint', $ids));
				}

				wp_reset_postdata();
			}
		}

		// If still empty, pick random accessories
		if (empty($ids)){
			$q = new WP_Query([
				'post_type'=>'product',
				'posts_per_page'=>3,
				'post_status'=>'publish',
				'orderby'=>'rand',
				'tax_query'=>[
					[
						'taxonomy'=>'product_cat',
						'field'=>'slug',
						'terms'=>'accessories'
					]
				],
				'fields'=>'ids'
			]);

			if ($q->have_posts()) $ids = $q->posts;
			wp_reset_postdata();
		}

		$products = [];
		foreach(array_slice($ids, 0, 3) as $id){
			$p = wc_get_product($id);
			if (!$p) continue;

			$img_id = $p->get_image_id();
			$hero = $img_id ? wp_get_attachment_image_url($img_id, 'medium') : wc_placeholder_img_src('medium');

			$products[] = [
				'id'=>$p->get_id(),
				'title'=>$p->get_title(),
				'permalink'=>get_permalink($p->get_id()),
				'price'=>$p->get_price(),
				'regular'=>$p->get_regular_price(),
				'sale'=>$p->get_sale_price(),
				'image'=>$hero
			];
		}

		gstore_log_debug('fbt_resolved', ['pid'=>$pid,'count'=>count($products)]);

		$result = ['ok'=>true,'products'=>$products];

		// Cache for 1 hour
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		WARRANTY (WITH CACHING)
	--------------------------*/
	public function get_warranty(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		// Check cache
		$cache_key = 'gstore_warranty_' . $pid;
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			return new WP_REST_Response($cached, 200);
		}

		$ctx = gstore_epp_parse_by_product_id($pid);
		global $wpdb;

		$warranty_text = '';

		// Check model rules (with storage-specific key first)
		if ($ctx && $ctx['group_key']) {
			$storage = $ctx['storage'] ?: '';
			$storage_normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $storage));

			$row = null;

			// Try storage-specific first
			if ($storage_normalized) {
				$group_key_with_storage = $ctx['group_key'] . ' ' . $storage_normalized;
				$row = $wpdb->get_row(
					$wpdb->prepare(
						"SELECT warranty_text FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1",
						$group_key_with_storage
					),
					ARRAY_A
				);
			}

			// Fallback to model-level
			if (!$row) {
				$row = $wpdb->get_row(
					$wpdb->prepare(
						"SELECT warranty_text FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1",
						$ctx['group_key']
					),
					ARRAY_A
				);
			}

			if ($row && !empty($row['warranty_text'])) {
				$warranty_text = $row['warranty_text'];
			}
		}

		// Fallback default
		if (empty($warranty_text)) {
			$translations = get_option('gstore_epp_translations', []);
			$warranty_text = $translations['default_warranty_content']
			                 ?? '1 year limited hardware warranty. Extended warranty options available at checkout.';
		}

		$result = [
			'ok'=>true,
			'warranty_text'=>$warranty_text
		];

		// Cache for 1 hour
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		LAPTOP ADD-ONS (INSIDE CLASS)
	--------------------------*/
	public function get_laptop_addons(WP_REST_Request $r){
		global $wpdb;
		$tbl = gstore_epp_table_addons();
		$rows = $wpdb->get_results("SELECT scope, data_json FROM {$tbl}", ARRAY_A);
		$data = ['laptop_ram'=>[], 'laptop_storage'=>[]];
		if ($rows){
			foreach($rows as $row){
				$arr = json_decode($row['data_json'], true);
				if (!is_array($arr)) $arr=[];
				if ($row['scope']==='laptop_ram') $data['laptop_ram']=$arr;
				if ($row['scope']==='laptop_storage') $data['laptop_storage']=$arr;
			}
		}
		if (empty($data['laptop_ram']) && empty($data['laptop_storage'])){
			// fallback to options
			$opt = get_option('gstore_global_addons', []);
			if (isset($opt['laptop_ram'])) $data['laptop_ram']=$opt['laptop_ram'];
			if (isset($opt['laptop_storage'])) $data['laptop_storage']=$opt['laptop_storage'];
		}
		return new WP_REST_Response(['ok'=>true] + $data, 200);
	}

} // END CLASS

new GStore_EPP_REST();

// CRITICAL: Clear ALL caches when product is updated
add_action('save_post_product', function($post_id){
	// Clear this product's caches
	delete_transient('gstore_siblings_' . $post_id);
	delete_transient('gstore_pricing_' . $post_id);
	delete_transient('gstore_fbt_' . $post_id);
	delete_transient('gstore_warranty_' . $post_id);
	delete_transient('gstore_compare_specs_' . $post_id);

	// Also clear cache for products in same model
	$ctx = gstore_epp_parse_by_product_id($post_id);
	if ($ctx && $ctx['model']) {
		// Use direct query for performance
		global $wpdb;
		$model_slug = sanitize_title($ctx['model']);

		$sql = "
			SELECT DISTINCT p.ID 
			FROM {$wpdb->posts} p
			INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
			INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
			INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
			WHERE p.post_type = 'product'
			AND tt.taxonomy = 'pa_model'
			AND t.slug = %s
			LIMIT 200
		";

		$sibling_ids = $wpdb->get_col($wpdb->prepare($sql, $model_slug));

		foreach($sibling_ids as $id) {
			delete_transient('gstore_siblings_' . $id);
			delete_transient('gstore_pricing_' . $id);
			delete_transient('gstore_fbt_' . $id);
			delete_transient('gstore_warranty_' . $id);
		}
	}
}, 10, 1);

// Clear search cache when any product is updated
add_action('save_post_product', function(){
	global $wpdb;
	$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_search_%'");
}, 20);
