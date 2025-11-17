<?php
if (!defined('ABSPATH')) { exit; }

/**
 * FBT Cart Integration
 * Handles custom pricing for FBT gifts in WooCommerce cart
 */

/**
 * Add custom cart item data to track FBT gift source
 * This runs when products are added to cart
 */
add_filter('woocommerce_add_cart_item_data', 'gstore_fbt_add_cart_item_data', 10, 3);
function gstore_fbt_add_cart_item_data($cart_item_data, $product_id, $variation_id){
	// Check if this product is being added as an FBT gift
	if (isset($_POST['fbt_gift_source']) && isset($_POST['fbt_gift_price'])){
		$source_product_id = absint($_POST['fbt_gift_source']);
		$custom_price = floatval($_POST['fbt_gift_price']);

		// Verify this is actually configured as a gift from source product
		$gifts = get_post_meta($source_product_id, '_gstore_fbt_gifts', true);
		if (!is_array($gifts)) $gifts = [];

		$is_valid_gift = false;
		foreach ($gifts as $gift) {
			if (isset($gift['id']) && absint($gift['id']) === $product_id && isset($gift['price']) && floatval($gift['price']) === $custom_price) {
				$is_valid_gift = true;
				break;
			}
		}

		// Only apply custom price if valid
		if ($is_valid_gift) {
			$cart_item_data['fbt_gift_source'] = $source_product_id;
			$cart_item_data['fbt_gift_price'] = $custom_price;
			$cart_item_data['unique_key'] = md5(microtime().rand()); // Make each item unique
		}
	}

	return $cart_item_data;
}

/**
 * Apply custom pricing to FBT gifts in cart
 * This runs before cart totals are calculated
 */
add_action('woocommerce_before_calculate_totals', 'gstore_fbt_apply_custom_pricing', 10, 1);
function gstore_fbt_apply_custom_pricing($cart){
	if (is_admin() && !defined('DOING_AJAX')) return;
	if (did_action('woocommerce_before_calculate_totals') >= 2) return;

	foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
		// Check if this is an FBT gift with custom pricing
		if (isset($cart_item['fbt_gift_price']) && isset($cart_item['fbt_gift_source'])) {
			$custom_price = floatval($cart_item['fbt_gift_price']);

			// Apply custom price
			$cart_item['data']->set_price($custom_price);
		}
	}
}

/**
 * Display FBT gift indicator in cart
 */
add_filter('woocommerce_cart_item_name', 'gstore_fbt_cart_item_name', 10, 3);
function gstore_fbt_cart_item_name($product_name, $cart_item, $cart_item_key){
	if (isset($cart_item['fbt_gift_source'])) {
		$source_product = wc_get_product($cart_item['fbt_gift_source']);
		if ($source_product) {
			$product_name .= '<br><small style="color:#ff9800;">🎁 Gift with ' . esc_html($source_product->get_name()) . '</small>';
		}
	}
	return $product_name;
}

/**
 * Pass FBT gift data through checkout for order meta
 */
add_filter('woocommerce_get_item_data', 'gstore_fbt_get_item_data', 10, 2);
function gstore_fbt_get_item_data($item_data, $cart_item){
	if (isset($cart_item['fbt_gift_source'])) {
		$source_product = wc_get_product($cart_item['fbt_gift_source']);
		if ($source_product) {
			$item_data[] = array(
				'key'   => 'Gift with',
				'value' => $source_product->get_name()
			);
		}
	}
	return $item_data;
}

/**
 * Save FBT gift data to order item meta
 */
add_action('woocommerce_checkout_create_order_line_item', 'gstore_fbt_order_item_meta', 10, 4);
function gstore_fbt_order_item_meta($item, $cart_item_key, $values, $order){
	if (isset($values['fbt_gift_source'])) {
		$item->add_meta_data('_fbt_gift_source', $values['fbt_gift_source']);
		$item->add_meta_data('_fbt_gift_price', $values['fbt_gift_price']);
	}
}
