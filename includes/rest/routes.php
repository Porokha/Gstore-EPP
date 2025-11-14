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

		// Delivery
		register_rest_route(self::NS, '/delivery', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_delivery'],
			'args'=>[
				'warehouse'=>['required'=>false,'type'=>'string','default'=>'tbilisi']
			]
		]);

		// Diagnostic: Check attribute storage
		register_rest_route(self::NS, '/check-attributes', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'check_attributes'],
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

		// DEBUG MODE: Add ?debug=1 to see detailed information
		$debug_mode = !empty($r->get_param('debug'));

		// CHECK CACHE FIRST (1 hour) - skip cache in debug mode
		$cache_key = 'gstore_siblings_' . $pid;
		$cached = $debug_mode ? false : get_transient($cache_key);

		if ($cached !== false) {
			gstore_log_debug('siblings_cache_hit', ['pid'=>$pid]);
			return new WP_REST_Response($cached, 200);
		}

		$ctx = gstore_epp_parse_by_product_id($pid);

		$brand = $ctx['brand'];
		$model = $ctx['model'];
		$group_key = $ctx['group_key'];

		// DEBUG: Log parsed context
		gstore_log_debug('siblings_context', [
			'pid' => $pid,
			'brand' => $brand,
			'model' => $model,
			'group_key' => $group_key,
			'storage' => $ctx['storage'] ?? '',
			'color' => $ctx['color'] ?? '',
			'condition' => $ctx['condition'] ?? '',
			'device_type' => $ctx['device_type'] ?? ''
		]);

		// If no model, can't find siblings
		if (!$model){
			gstore_log_error('siblings_no_model', ['pid'=>$pid,'ctx'=>$ctx]);
			$result = ['ok'=>false,'error'=>'MODEL_REQUIRED','debug'=>$ctx];
			set_transient($cache_key, $result, HOUR_IN_SECONDS);
			return new WP_REST_Response($result, 200);
		}

		if (!$group_key) {
			gstore_log_error('siblings_no_group_key', ['pid'=>$pid,'ctx'=>$ctx]);
			$result = ['ok'=>false,'error'=>'GROUP_KEY_REQUIRED','debug'=>$ctx];
			set_transient($cache_key, $result, HOUR_IN_SECONDS);
			return new WP_REST_Response($result, 200);
		}

		// OPTIMIZED: Use direct database query instead of WP_Query
		global $wpdb;

		// FIX: Get the actual pa_model term from this product instead of generating slug
		// This fixes the slug mismatch issue (e.g., "s23" vs "s-23")
		$model_terms = wc_get_product_terms($pid, 'pa_model', ['fields' => 'all']);
		$model_slug = null;
		$model_term_id = null;

		if (!empty($model_terms) && !is_wp_error($model_terms)) {
			$model_term = $model_terms[0]; // Use first term
			$model_slug = $model_term->slug;
			$model_term_id = $model_term->term_id;
		}

		// Fallback: if no taxonomy term found, generate slug from parsed model
		if (!$model_slug) {
			$model_slug = sanitize_title($model);
		}

		// Query by term_id if available (most reliable), otherwise by slug
		if ($model_term_id) {
			$sql = "
				SELECT DISTINCT p.ID
				FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
				INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				WHERE p.post_type = 'product'
				AND p.post_status = 'publish'
				AND tt.taxonomy = 'pa_model'
				AND tt.term_id = %d
				LIMIT 200
			";
			$product_ids = $wpdb->get_col($wpdb->prepare($sql, $model_term_id));
		} else {
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
		}

		// DEBUG: Log query results
		gstore_log_debug('siblings_query_taxonomy', [
			'model_term_id' => $model_term_id,
			'model_slug' => $model_slug,
			'query_method' => $model_term_id ? 'term_id' : 'slug',
			'found_ids' => $product_ids,
			'count' => count($product_ids)
		]);

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

			// DEBUG: Log meta query results
			gstore_log_debug('siblings_query_meta_fallback', [
				'model_slug' => $model_slug,
				'found_ids' => $product_ids,
				'count' => count($product_ids)
			]);
		}

		$items = [];
		$filtered_out = []; // Track products that don't match

		if (!empty($product_ids)){
			foreach($product_ids as $id){
				$p_model = gstore_epp_attr($id, 'model');

				// Match by model (case-insensitive)
				if (strcasecmp($p_model, $model) === 0){
					$ip = wc_get_product($id);
					if (!$ip) {
						$filtered_out[] = ['id' => $id, 'reason' => 'product_not_found'];
						continue;
					}

					// CRITICAL: Skip out-of-stock products
					if (!$ip->is_in_stock()) {
						$filtered_out[] = ['id' => $id, 'reason' => 'out_of_stock', 'title' => $ip->get_title()];
						continue;
					}

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

					// Get color and try to get hex value
					$color_name = gstore_epp_attr($ip->get_id(),'color');
					$color_hex = gstore_epp_attr($ip->get_id(),'color_hex');

					// If no hex attribute, map common color names to hex
					if (!$color_hex && $color_name) {
						$color_map = [
							'black' => '#000000',
							'white' => '#FFFFFF',
							'silver' => '#C0C0C0',
							'gray' => '#808080',
							'grey' => '#808080',
							'gold' => '#FFD700',
							'rose gold' => '#B76E79',
							'blue' => '#0000FF',
							'navy' => '#000080',
							'midnight' => '#191970',
							'green' => '#008000',
							'alpine green' => '#2F4F4F',
							'red' => '#FF0000',
							'product red' => '#E0115F',
							'purple' => '#800080',
							'deep purple' => '#673AB7',
							'pink' => '#FFC0CB',
							'yellow' => '#FFFF00',
							'starlight' => '#F5F5DC',
							'sierra blue' => '#69C2D0',
							'graphite' => '#383838',
							'space gray' => '#4A4A4A',
							'space black' => '#1C1C1C',
							'titanium' => '#878681'
						];
						$color_lower = strtolower(trim($color_name));
						$color_hex = isset($color_map[$color_lower]) ? $color_map[$color_lower] : '#333333';
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
						'color'=>$color_name,
						'hex'=>$color_hex,
						'image'=>$hero
					];
				} else {
					// Model doesn't match - log it
					$filtered_out[] = [
						'id' => $id,
						'reason' => 'model_mismatch',
						'expected_model' => $model,
						'found_model' => $p_model
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

		// Add debug info if debug mode is enabled
		if ($debug_mode) {
			$result['_debug'] = [
				'context' => $ctx,
				'model_slug' => $model_slug ?? '',
				'queried_product_ids' => $product_ids ?? [],
				'queried_count' => count($product_ids ?? []),
				'found_count' => count($items),
				'filtered_count' => count($filtered_out),
				'filtered_products' => $filtered_out,
				'cache_skipped' => true
			];
		}

		// CACHE FOR 1 HOUR (don't cache debug responses)
		if (!$debug_mode) {
			set_transient($cache_key, $result, HOUR_IN_SECONDS);
		}

		// DEBUG: Log results including filtered products
		gstore_log_debug('siblings_found', [
			'pid'=>$pid,
			'model'=>$model,
			'count'=>count($items),
			'filtered_count'=>count($filtered_out),
			'filtered_reasons'=>array_count_values(array_column($filtered_out, 'reason')),
			'cached'=>true
		]);

		// DEBUG: If no siblings found but products were queried, log why
		if (empty($items) && !empty($product_ids)) {
			gstore_log_error('siblings_all_filtered', [
				'pid' => $pid,
				'queried_count' => count($product_ids),
				'filtered_details' => $filtered_out
			]);
		}

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

		// If empty, fallback to group default (same model)
		if (empty($ids)){
			$ctx = gstore_epp_parse_by_product_id($pid);
			if ($ctx && $ctx['group_key'] && $ctx['model']){
				// Find group default product with same model
				$model_slug = sanitize_title($ctx['model']);
				$q = new WP_Query([
					'post_type'=>'product',
					'posts_per_page'=>1,
					'post_status'=>'publish',
					'meta_query'=>[
						['key'=>'_gstore_is_group_default','value'=>'yes']
					],
					'tax_query'=>[
						[
							'taxonomy'=>'pa_model',
							'field'=>'slug',
							'terms'=>$model_slug
						]
					],
					'fields'=>'ids'
				]);

				if ($q->have_posts()){
					$default_id = $q->posts[0];
					$ids = get_post_meta($default_id, '_gstore_fbt_ids', true);
					if (!is_array($ids)) $ids = [];
					$ids = array_filter(array_map('absint', $ids));
					gstore_log_debug('fbt_fallback_group_default', ['pid'=>$pid,'default_id'=>$default_id,'model'=>$ctx['model']]);
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
		DELIVERY (WITH CACHING)
	--------------------------*/
	public function get_delivery(WP_REST_Request $r){
		$warehouse = sanitize_text_field($r->get_param('warehouse') ?: 'tbilisi');
		$warehouse_normalized = strtolower($warehouse);

		// Check cache
		$cache_key = 'gstore_delivery_' . $warehouse_normalized;
		$cached = get_transient($cache_key);
		if ($cached !== false) {
			return new WP_REST_Response($cached, 200);
		}

		// Get delivery texts from options
		$delivery_texts = get_option('gstore_epp_delivery_texts', []);
		$delivery_text = '';

		// Try to find text for this warehouse
		if (isset($delivery_texts[$warehouse_normalized])) {
			$delivery_text = $delivery_texts[$warehouse_normalized];
		}

		// Fallback to default
		if (empty($delivery_text)) {
			$delivery_text = $delivery_texts['default'] ?? 'Standard delivery: 2-3 business days.';
		}

		$result = [
			'ok'=>true,
			'warehouse'=>$warehouse,
			'delivery_text'=>$delivery_text
		];

		// Cache for 1 hour
		set_transient($cache_key, $result, HOUR_IN_SECONDS);

		return new WP_REST_Response($result, 200);
	}

	/* -------------------------
		LAPTOP ADD-ONS (INSIDE CLASS)
	--------------------------*/
	public function get_laptop_addons(WP_REST_Request $r){
		// Get addons from option (saved by admin page)
		$opt = get_option('gstore_epp_addons_laptop', ['rows'=>[]]);
		$rows = isset($opt['rows']) && is_array($opt['rows']) ? $opt['rows'] : [];

		// Separate into RAM and Storage based on key prefix (or return all as generic addons)
		$laptop_ram = [];
		$laptop_storage = [];

		foreach($rows as $row){
			if (isset($row['key']) && isset($row['label']) && isset($row['price'])){
				// If key starts with 'ram', put in laptop_ram, else in laptop_storage
				if (stripos($row['key'], 'ram') === 0){
					$laptop_ram[] = $row;
				} else if (stripos($row['key'], 'storage') === 0 || stripos($row['key'], 'ssd') === 0){
					$laptop_storage[] = $row;
				} else {
					// Default: add to both or just RAM
					$laptop_ram[] = $row;
				}
			}
		}

		return new WP_REST_Response([
			'ok'=>true,
			'laptop_ram'=>$laptop_ram,
			'laptop_storage'=>$laptop_storage
		], 200);
	}

	/* -------------------------
		DIAGNOSTIC: CHECK ATTRIBUTES
	--------------------------*/
	public function check_attributes(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		global $wpdb;
		$product = wc_get_product($pid);
		if (!$product) {
			return new WP_REST_Response(['ok'=>false,'error'=>'PRODUCT_NOT_FOUND'], 404);
		}

		$result = [
			'ok' => true,
			'product_id' => $pid,
			'product_title' => $product->get_title(),
			'attributes' => [],
			'pa_model_terms' => [],
			'pa_brand_terms' => [],
			'post_meta' => [],
			'database_query_test' => [],
			'diagnosis' => []
		];

		// 1. Get all product attributes
		$attributes = $product->get_attributes();
		foreach ($attributes as $attr_name => $attribute) {
			$result['attributes'][$attr_name] = [
				'name' => $attribute->get_name(),
				'is_taxonomy' => $attribute->is_taxonomy(),
				'visible' => $attribute->get_visible(),
				'variation' => $attribute->get_variation(),
				'options' => $attribute->get_options()
			];
		}

		// 2. Check pa_model taxonomy terms
		$model_terms = wc_get_product_terms($pid, 'pa_model', ['fields' => 'all']);
		if (!empty($model_terms) && !is_wp_error($model_terms)) {
			foreach ($model_terms as $term) {
				$result['pa_model_terms'][] = [
					'term_id' => $term->term_id,
					'name' => $term->name,
					'slug' => $term->slug,
					'taxonomy' => $term->taxonomy
				];
			}
		}

		// 3. Check pa_brand taxonomy terms
		$brand_terms = wc_get_product_terms($pid, 'pa_brand', ['fields' => 'all']);
		if (!empty($brand_terms) && !is_wp_error($brand_terms)) {
			foreach ($brand_terms as $term) {
				$result['pa_brand_terms'][] = [
					'term_id' => $term->term_id,
					'name' => $term->name,
					'slug' => $term->slug,
					'taxonomy' => $term->taxonomy
				];
			}
		}

		// 4. Check post meta for attribute storage
		$meta_keys = ['_product_attributes', 'attribute_pa_model', 'attribute_pa_brand'];
		foreach ($meta_keys as $key) {
			$value = get_post_meta($pid, $key, true);
			if ($value) {
				$result['post_meta'][$key] = $value;
			}
		}

		// 5. Test database query for siblings (matches actual siblings query logic)
		$ctx = gstore_epp_parse_by_product_id($pid);
		if ($ctx && $ctx['model']) {
			// Use same logic as siblings query: get term_id from product
			$model_terms_test = wc_get_product_terms($pid, 'pa_model', ['fields' => 'all']);
			$model_term_id_test = null;
			$model_slug_test = sanitize_title($ctx['model']);

			if (!empty($model_terms_test) && !is_wp_error($model_terms_test)) {
				$model_term_id_test = $model_terms_test[0]->term_id;
			}

			// Query by term_id (like actual siblings query)
			if ($model_term_id_test) {
				$sql = "
					SELECT DISTINCT p.ID, p.post_title
					FROM {$wpdb->posts} p
					INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
					INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
					WHERE p.post_type = 'product'
					AND p.post_status = 'publish'
					AND tt.taxonomy = 'pa_model'
					AND tt.term_id = %d
					LIMIT 20
				";
				$products = $wpdb->get_results($wpdb->prepare($sql, $model_term_id_test), ARRAY_A);
				$query_display = str_replace('%d', $model_term_id_test, $sql);
			} else {
				// Fallback to slug (old method - will fail on slug mismatch)
				$sql = "
					SELECT DISTINCT p.ID, p.post_title
					FROM {$wpdb->posts} p
					INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
					INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
					INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
					WHERE p.post_type = 'product'
					AND p.post_status = 'publish'
					AND tt.taxonomy = 'pa_model'
					AND t.slug = %s
					LIMIT 20
				";
				$products = $wpdb->get_results($wpdb->prepare($sql, $model_slug_test), ARRAY_A);
				$query_display = str_replace('%s', "'" . $model_slug_test . "'", $sql);
			}

			$result['database_query_test'] = [
				'model_from_parse' => $ctx['model'],
				'model_term_id' => $model_term_id_test,
				'model_slug' => $model_slug_test,
				'query_method' => $model_term_id_test ? 'term_id' : 'slug',
				'query' => $query_display,
				'found_count' => count($products),
				'found_products' => $products
			];
		}

		// 6. Diagnosis
		if (empty($result['pa_model_terms'])) {
			$result['diagnosis'][] = [
				'issue' => 'NO_PA_MODEL_TAXONOMY',
				'severity' => 'CRITICAL',
				'message' => 'Product does not have pa_model taxonomy term assigned',
				'solution' => 'Edit product in WordPress admin → Attributes → Model → Select from dropdown (not custom text)'
			];
		}

		if (empty($result['database_query_test']['found_products'])) {
			$result['diagnosis'][] = [
				'issue' => 'ZERO_SIBLINGS_FOUND',
				'severity' => 'CRITICAL',
				'message' => 'Database query found 0 products with matching model taxonomy',
				'solution' => 'Ensure Model is stored as taxonomy attribute (pa_model), not custom attribute'
			];
		}

		if (!empty($result['attributes']['pa_model']) && !$result['attributes']['pa_model']['is_taxonomy']) {
			$result['diagnosis'][] = [
				'issue' => 'MODEL_NOT_TAXONOMY',
				'severity' => 'CRITICAL',
				'message' => 'Model attribute exists but is not a taxonomy attribute',
				'solution' => 'Convert Model to global attribute in Products → Attributes'
			];
		}

		return new WP_REST_Response($result, 200);
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
	delete_transient('gstore_shipping_' . $post_id);

	// Also clear cache for products in same model
	$ctx = gstore_epp_parse_by_product_id($post_id);
	if ($ctx && $ctx['model']) {
		global $wpdb;

		// FIX: Use actual term_id instead of generated slug to match siblings query
		$model_terms = wc_get_product_terms($post_id, 'pa_model', ['fields' => 'all']);
		if (!empty($model_terms) && !is_wp_error($model_terms)) {
			$model_term_id = $model_terms[0]->term_id;

			$sql = "
				SELECT DISTINCT p.ID
				FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
				INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				WHERE p.post_type = 'product'
				AND tt.taxonomy = 'pa_model'
				AND tt.term_id = %d
				LIMIT 200
			";

			$sibling_ids = $wpdb->get_col($wpdb->prepare($sql, $model_term_id));

			foreach($sibling_ids as $id) {
				delete_transient('gstore_siblings_' . $id);
				delete_transient('gstore_pricing_' . $id);
				delete_transient('gstore_fbt_' . $id);
				delete_transient('gstore_warranty_' . $id);
				delete_transient('gstore_shipping_' . $id);
			}
		}
	}
}, 10, 1);

// Clear search cache when any product is updated
add_action('save_post_product', function(){
	global $wpdb;
	$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_search_%'");
}, 20);

// OPTIMIZED: Daily cleanup of expired transients to prevent database bloat
add_action('gstore_epp_daily_cleanup', function(){
	global $wpdb;
	// Clean up expired transients
	$wpdb->query(
		"DELETE FROM {$wpdb->options} 
		 WHERE option_name LIKE '_transient_gstore_%' 
		 OR option_name LIKE '_transient_timeout_gstore_%'"
	);
	gstore_log_debug('transient_cleanup', ['action' => 'daily_cleanup_completed']);
});

// Schedule the cleanup event if not already scheduled
if (!wp_next_scheduled('gstore_epp_daily_cleanup')) {
	wp_schedule_event(time(), 'daily', 'gstore_epp_daily_cleanup');
}

// Clear scheduled event on plugin deactivation
register_deactivation_hook(GSTORE_EPP_DIR . 'gstore-epp.php', function(){
	$timestamp = wp_next_scheduled('gstore_epp_daily_cleanup');
	if ($timestamp) {
		wp_unschedule_event($timestamp, 'gstore_epp_daily_cleanup');
	}
});
