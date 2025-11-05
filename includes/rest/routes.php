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

		// Pricing
		register_rest_route(self::NS, '/pricing', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_pricing'],
			'args'=>[
				'product_id'=>['required'=>true,'type'=>'integer']
			]
		]);

		// Siblings
		register_rest_route(self::NS, '/siblings', [
			'methods'=>'GET',
			'permission_callback'=>'__return_true',
			'callback'=>[$this,'get_siblings'],
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
		PRICING
	--------------------------*/
	public function get_pricing(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		$ctx = gstore_epp_parse_by_product_id($pid);

		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare("SELECT * FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1", $ctx['group_key']),
			ARRAY_A
		);

		if (!$row){
			return new WP_REST_Response([
				'ok'=>true,
				'exists'=>false,
				'device_type'=>$ctx['device_type'],
				'group_key'=>$ctx['group_key'],
				'pricing'=>[]
			], 200);
		}

		$pricing = $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];

		return new WP_REST_Response([
			'ok'=>true,
			'exists'=>true,
			'device_type'=>$row['device_type'],
			'group_key'=>$row['group_key'],
			'default_condition'=>$row['default_condition'],
			'pricing'=>$pricing
		], 200);
	}

	/* -------------------------
		SIBLINGS
	--------------------------*/
	public function get_siblings(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		$ctx = gstore_epp_parse_by_product_id($pid);

		$brand = $ctx['brand'];
		$model = $ctx['model'];
		if (!$brand || !$model){
			gstore_log_error('siblings_incomplete_attrs', ['pid'=>$pid,'ctx'=>$ctx]);
			return new WP_REST_Response(['ok'=>false,'error'=>'ATTR_INCOMPLETE','debug'=>$ctx], 200);
		}

		$q = new WP_Query([
			'post_type'=>'product',
			'posts_per_page'=>-1,
			'post_status'=>'publish',
			'fields'=>'ids'
		]);

		$items = [];
		foreach($q->posts as $id){
			$p_brand = gstore_epp_attr($id, 'brand');
			$p_model = gstore_epp_attr($id, 'model');

			if (strcasecmp($p_brand, $brand) === 0 && strcasecmp($p_model, $model) === 0){
				$ip = wc_get_product($id);
				if (!$ip) continue;

				$img_id = $ip->get_image_id();
				$hero = $img_id ? wp_get_attachment_image_url($img_id, 'large') : wc_placeholder_img_src('large');

				$items[] = [
					'id'=>$ip->get_id(),
					'title'=>$ip->get_title(),
					'permalink'=>get_permalink($ip->get_id()),
					'price'=>$ip->get_price(),
					'regular'=>$ip->get_regular_price(),
					'sale'=>$ip->get_sale_price(),
					'condition'=>gstore_epp_attr($ip->get_id(),'condition'),
					'brand'=>$p_brand,
					'model'=>$p_model,
					'storage'=>gstore_epp_attr($ip->get_id(),'storage'),
					'color'=>gstore_epp_attr($ip->get_id(),'color'),
					'image'=>$hero
				];
			}
		}

		wp_reset_postdata();

		gstore_log_debug('siblings_found', [
			'pid'=>$pid,
			'brand'=>$brand,
			'model'=>$model,
			'count'=>count($items)
		]);

		return new WP_REST_Response(['ok'=>true,'brand'=>$brand,'model'=>$model,'siblings'=>$items], 200);
	}

	/* -------------------------
		COMPARE SPECS
	--------------------------*/
	public function get_compare_specs(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

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

		return new WP_REST_Response([
			'ok'=>true,
			'product_id'=>$pid,
			'title'=>$title,
			'specs'=>$specs
		], 200);
	}

	/* -------------------------
		SEARCH PRODUCTS
	--------------------------*/
	public function search_products(WP_REST_Request $r){
		$search = sanitize_text_field($r->get_param('search') ?: '');
		$limit  = absint($r->get_param('limit') ?: 20);

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

		return new WP_REST_Response(['ok'=>true,'products'=>$products], 200);
	}

	/* -------------------------
		FBT
	--------------------------*/
	public function get_fbt(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

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

		return new WP_REST_Response(['ok'=>true,'products'=>$products], 200);
	}

	/* -------------------------
		WARRANTY
	--------------------------*/
	public function get_warranty(WP_REST_Request $r){
		$pid = absint($r->get_param('product_id'));
		if (!$pid)
			return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);

		$ctx = gstore_epp_parse_by_product_id($pid);
		global $wpdb;

		$warranty_text = '';

		// Check model rules
		if ($ctx && $ctx['group_key']) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT warranty_text FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1",
					$ctx['group_key']
				),
				ARRAY_A
			);

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

		return new WP_REST_Response([
			'ok'=>true,
			'warranty_text'=>$warranty_text
		], 200);
	}
}

new GStore_EPP_REST();
