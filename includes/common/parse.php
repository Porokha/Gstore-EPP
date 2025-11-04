<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Normalize string to slugish key.
 */
function gstore_epp_norm($s){
	$s = is_string($s) ? $s : '';
	$s = trim(wp_strip_all_tags($s));
	$s = strtolower($s);
	// Remove extra spaces
	$s = preg_replace('~\s+~',' ',$s);
	// Remove special characters but keep spaces
	$s = preg_replace('~[^a-z0-9\s\-]~','', $s);
	return trim($s);
}

/**
 * Get attribute value by priority:
 *  1) taxonomy attr pa_xxx (product attributes global)
 *  2) post meta 'attribute_xxx' (inline/custom)
 */
function gstore_epp_attr($product_id, $key){
	$key = strtolower($key);
	$p = wc_get_product($product_id);
	if (!$p) return '';

	// Try taxonomy-based first (pa_*)
	$tax = 'pa_'.$key;
	$terms = wc_get_product_terms($product_id, $tax, ['fields'=>'names']);
	if (!empty($terms) && !is_wp_error($terms)) {
		return trim($terms[0]);
	}

	// Try inline/custom meta
	$v = get_post_meta($product_id, 'attribute_'.$key, true);
	if ($v) return trim($v);

	// Fallback: search in attributes array
	$attrs = $p->get_attributes();
	if (!empty($attrs)){
		foreach($attrs as $a){
			if (!is_object($a) || !method_exists($a,'get_name')) continue;

			$nm = $a->get_name(); // 'pa_color' or custom key

			// Match by taxonomy name or attribute key
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

/**
 * Device type by attribute 'device_type' (phone/laptop) with fallback by category keywords.
 */
function gstore_epp_device_type($product_id){
	$v = gstore_epp_attr($product_id, 'device_type');
	$v = strtolower(trim($v));

	// Direct match
	if ($v==='phone' || $v==='iphone' || $v==='phones' || $v==='smartphone') return 'phone';
	if ($v==='laptop' || $v==='notebook' || $v==='macbook' || $v==='laptops') return 'laptop';

	// Fallback by categories
	$cats = wp_get_post_terms($product_id, 'product_cat', ['fields'=>'names']);
	if (is_wp_error($cats)) $cats = [];

	$flat = strtolower( implode(' ', (array)$cats) );
	if (str_contains($flat, 'phone') || str_contains($flat, 'iphone') || str_contains($flat, 'smartphone')) return 'phone';
	if (str_contains($flat, 'laptop') || str_contains($flat, 'notebook') || str_contains($flat, 'macbook')) return 'laptop';

	return 'phone'; // default
}

/**
 * Smart brand extraction - removes redundant words
 */
function gstore_epp_extract_brand($raw_brand, $raw_model){
	$brand = gstore_epp_norm($raw_brand);
	$model = gstore_epp_norm($raw_model);

	// If model starts with brand, the brand is valid
	if ($model && str_starts_with($model, $brand)) {
		return $brand;
	}

	// If brand is empty or generic, try to extract from model
	$generic = ['phone', 'iphone', 'smartphone', 'laptop', 'notebook', 'macbook'];
	if (!$brand || in_array($brand, $generic)) {
		// Extract first word from model as brand
		$words = explode(' ', $model);
		if (!empty($words[0]) && !in_array($words[0], $generic)) {
			return $words[0];
		}
	}

	return $brand;
}

/**
 * Smart model extraction - removes brand prefix if present
 */
function gstore_epp_extract_model($raw_brand, $raw_model){
	$brand = gstore_epp_norm($raw_brand);
	$model = gstore_epp_norm($raw_model);

	// If model starts with brand, remove it
	if ($brand && $model && str_starts_with($model, $brand.' ')) {
		$model = trim(substr($model, strlen($brand)));
	}

	// Remove duplicate brand names (e.g., "apple apple iphone")
	$model = preg_replace('~\b'.$brand.'\s+'.$brand.'\b~', $brand, $model);

	// Clean up
	$model = trim($model);

	return $model;
}

/**
 * Context from a product id: brand, model, storage, color, condition, device_type, group_key
 * group_key = "brand model" (normalized, brand not repeated in model)
 */
function gstore_epp_parse_by_product_id($product_id){
	$raw_brand = gstore_epp_attr($product_id, 'brand');
	$raw_model = gstore_epp_attr($product_id, 'model');
	$storage    = gstore_epp_attr($product_id, 'storage');
	$color      = gstore_epp_attr($product_id, 'color');
	$condition  = gstore_epp_attr($product_id, 'condition');
	$dtype      = gstore_epp_device_type($product_id);

	// Smart extraction
	$brand = gstore_epp_extract_brand($raw_brand, $raw_model);
	$model = gstore_epp_extract_model($raw_brand, $raw_model);

	// Build group key: "brand model" (clean, no duplicates)
	$group_key = trim($brand . ' ' . $model);

	// Log for debugging
	gstore_log_debug('parse_product', [
		'pid' => $product_id,
		'raw_brand' => $raw_brand,
		'raw_model' => $raw_model,
		'clean_brand' => $brand,
		'clean_model' => $model,
		'group_key' => $group_key
	]);

	return [
		'brand' => $raw_brand ?: $brand,  // Return original for display
		'model' => $raw_model ?: $model,  // Return original for display
		'storage' => $storage,
		'color' => $color,
		'condition' => $condition,
		'device_type' => $dtype,
		'group_key' => $group_key,  // Use clean version for grouping
	];
}