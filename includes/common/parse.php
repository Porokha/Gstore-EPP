<?php
if (!defined('ABSPATH')) { exit; }

function gstore_epp_norm($s){
	$s = is_string($s) ? $s : '';
	$s = trim(wp_strip_all_tags($s));
	$s = strtolower($s);
	$s = preg_replace('~\s+~',' ',$s);
	$s = preg_replace('~[^a-z0-9\s\-]~','', $s);
	return trim($s);
}

function gstore_epp_attr($product_id, $key){
	$key = strtolower($key);
	$p = wc_get_product($product_id);
	if (!$p) return '';
	$tax = 'pa_'.$key;
	$terms = wc_get_product_terms($product_id, $tax, ['fields'=>'names']);
	if (!empty($terms) && !is_wp_error($terms)) {
		return trim($terms[0]);
	}
	$v = get_post_meta($product_id, 'attribute_'.$key, true);
	if ($v) return trim($v);
	$attrs = $p->get_attributes();
	if (!empty($attrs)){
		foreach($attrs as $a){
			if (!is_object($a) || !method_exists($a,'get_name')) continue;
			$nm = $a->get_name();
			if (strcasecmp($nm, $tax)===0 || strcasecmp($nm, $key)===0){
				if ($a->is_taxonomy()){
					$terms = wc_get_product_terms($product_id, $nm, ['fields'=>'names']);
					if (!empty($terms) && !is_wp_error($terms)) return trim($terms[0]);
				} else {
					$val = $a->get_options();
					if (!empty($val)) {
						$result = is_array($val) ? implode(', ', $val) : $val;
						return trim($result);
					}
				}
			}
		}
	}
	return '';
}

function gstore_epp_device_type($product_id){
	$v = gstore_epp_attr($product_id, 'device_type');
	$v = strtolower(trim($v));
	if ($v==='phone' || $v==='iphone' || $v==='phones' || $v==='smartphone') return 'phone';
	if ($v==='laptop' || $v==='notebook' || $v==='macbook' || $v==='laptops') return 'laptop';
	$cats = wp_get_post_terms($product_id, 'product_cat', ['fields'=>'names']);
	if (is_wp_error($cats)) $cats = [];
	$flat = strtolower( implode(' ', (array)$cats) );
	if (str_contains($flat, 'phone') || str_contains($flat, 'iphone') || str_contains($flat, 'smartphone')) return 'phone';
	if (str_contains($flat, 'laptop') || str_contains($flat, 'notebook') || str_contains($flat, 'macbook')) return 'laptop';
	return 'phone';
}

function gstore_epp_extract_brand($raw_brand, $raw_model){
	$brand = gstore_epp_norm($raw_brand);
	$model = gstore_epp_norm($raw_model);
	if ($model && str_starts_with($model, $brand)) {
		return $brand;
	}
	$generic = ['phone', 'iphone', 'smartphone', 'laptop', 'notebook', 'macbook'];
	if (!$brand || in_array($brand, $generic)) {
		$words = explode(' ', $model);
		if (!empty($words[0]) && !in_array($words[0], $generic)) {
			return $words[0];
		}
	}
	return $brand;
}

function gstore_epp_extract_model($raw_brand, $raw_model){
	$brand = gstore_epp_norm($raw_brand);
	$model = gstore_epp_norm($raw_model);
	if ($brand && $model && str_starts_with($model, $brand.' ')) {
		$model = trim(substr($model, strlen($brand)));
	}
	$model = preg_replace('~\b'.$brand.'\s+'.$brand.'\b~', $brand, $model);
	$model = trim($model);
	return $model;
}

function gstore_epp_parse_by_product_id($product_id){
	$raw_brand = gstore_epp_attr($product_id, 'brand');
	$raw_model = gstore_epp_attr($product_id, 'model');
	$storage    = gstore_epp_attr($product_id, 'storage');
	$color      = gstore_epp_attr($product_id, 'color');
	$condition  = gstore_epp_attr($product_id, 'condition');
	$dtype      = gstore_epp_device_type($product_id);
	$brand = gstore_epp_extract_brand($raw_brand, $raw_model);
	$model = gstore_epp_extract_model($raw_brand, $raw_model);
	$group_key = trim($brand . ' ' . $model);
	gstore_log_debug('parse_product', [
		'pid' => $product_id,
		'raw_brand' => $raw_brand,
		'raw_model' => $raw_model,
		'clean_brand' => $brand,
		'clean_model' => $model,
		'group_key' => $group_key
	]);
	return [
		'brand' => $raw_brand ?: $brand,
		'model' => $raw_model ?: $model,
		'storage' => $storage,
		'color' => $color,
		'condition' => $condition,
		'device_type' => $dtype,
		'group_key' => $group_key,
	];
}

/**
 * Get shipping time for a product.
 * Priority: Product attribute > Sibling attribute > Global default from translations
 * OPTIMIZED: Uses caching and limited queries
 */
function gstore_epp_get_shipping($product_id){
	// Check cache first
	$cache_key = 'gstore_shipping_' . $product_id;
	$cached = get_transient($cache_key);
	if ($cached !== false) {
		return $cached;
	}

	// Try the product's own shipping attribute
	$shipping = gstore_epp_attr($product_id, 'shipping');
	if ($shipping) {
		set_transient($cache_key, $shipping, HOUR_IN_SECONDS);
		return $shipping;
	}

	// Try siblings in the same model (OPTIMIZED: limit to 50 products)
	$ctx = gstore_epp_parse_by_product_id($product_id);
	if ($ctx && $ctx['group_key']) {
		global $wpdb;

		// Find sibling products with a shipping attribute (LIMITED QUERY)
		$q = new WP_Query([
			'post_type'=>'product',
			'posts_per_page'=>50, // OPTIMIZED: limit instead of -1
			'post_status'=>'publish',
			'fields'=>'ids',
			'post__not_in'=>[$product_id]
		]);

		if ($q->have_posts()){
			foreach($q->posts as $sibling_id){
				$sibling_ctx = gstore_epp_parse_by_product_id($sibling_id);
				if ($sibling_ctx && $sibling_ctx['group_key'] === $ctx['group_key']){
					$sibling_shipping = gstore_epp_attr($sibling_id, 'shipping');
					if ($sibling_shipping) {
						wp_reset_postdata();
						// Cache the result
						set_transient($cache_key, $sibling_shipping, HOUR_IN_SECONDS);
						return $sibling_shipping;
					}
				}
			}
		}
		wp_reset_postdata();
	}

	// Fall back to global default from translations
	$translations = get_option('gstore_epp_translations', []);
	$default_shipping = $translations['default_shipping'] ?? '2–3 business days';

	// Cache the default result
	set_transient($cache_key, $default_shipping, HOUR_IN_SECONDS);

	return $default_shipping;
}
