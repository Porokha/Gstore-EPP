<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Normalize string to slugish key.
 */
function gstore_epp_norm($s){
    $s = is_string($s) ? $s : '';
    $s = trim(wp_strip_all_tags($s));
    $s = strtolower($s);
    $s = preg_replace('~\s+~',' ',$s);
    return $s;
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
    // taxonomy-based
    $tax = 'pa_'.$key;
    $terms = wc_get_product_terms($product_id, $tax, ['fields'=>'names']);
    if (!empty($terms)) return $terms[0];

    // inline/custom
    $v = get_post_meta($product_id, 'attribute_'.$key, true);
    if ($v) return $v;

    // fallback: try from attributes array
    $attrs = $p->get_attributes();
    if (!empty($attrs)){
        foreach($attrs as $a){
            if (method_exists($a,'get_name')){
                $nm = $a->get_name(); // 'pa_color' or custom
                if (strcasecmp($nm, $tax)===0 || strcasecmp($nm, $key)===0){
                    if ($a->is_taxonomy()){
                        $terms = wc_get_product_terms($product_id, $nm, ['fields'=>'names']);
                        if (!empty($terms)) return $terms[0];
                    } else {
                        $val = $a->get_options();
                        if (!empty($val)) return is_array($val)? implode(', ', $val):$val;
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
    $v = strtolower($v);
    if ($v==='phone' || $v==='iphone' || $v==='phones') return 'phone';
    if ($v==='laptop' || $v==='notebook' || $v==='macbook') return 'laptop';

    // fallback by categories
    $cats = wp_get_post_terms($product_id, 'product_cat', ['fields'=>'names']);
    $flat = strtolower( implode(' ', (array)$cats) );
    if (str_contains($flat, 'phone') || str_contains($flat, 'iphone')) return 'phone';
    if (str_contains($flat, 'laptop') || str_contains($flat, 'notebook') || str_contains($flat, 'macbook')) return 'laptop';
    return 'phone'; // default
}

/**
 * Context from a product id: brand, model, storage, color, condition, device_type, group_key
 * group_key := "<brand> <model>" (strictly; storage NOT included)
 */
function gstore_epp_parse_by_product_id($product_id){
    $brand     = gstore_epp_attr($product_id, 'brand');
    $model     = gstore_epp_attr($product_id, 'model');
    $storage   = gstore_epp_attr($product_id, 'storage');
    $color     = gstore_epp_attr($product_id, 'color');
    $condition = gstore_epp_attr($product_id, 'condition'); // New / Used / Open Box
    $dtype     = gstore_epp_device_type($product_id);

    $brand_n = gstore_epp_norm($brand);
    $model_n = gstore_epp_norm($model);
    $group_key = trim($brand_n.' '.$model_n);

    return [
        'brand' => $brand,
        'model' => $model,
        'storage' => $storage,
        'color' => $color,
        'condition' => $condition,
        'device_type' => $dtype,
        'group_key' => $group_key,
    ];
}
