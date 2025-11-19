<?php
if (!defined('ABSPATH')) { exit; }

/**
 * FBT Cart Integration
 * Handles custom pricing for FBT gifts and offers in WooCommerce cart
 */

/**
 * SECURE AJAX ENDPOINT: Add FBT item to cart with nonce protection
 * This prevents CSRF attacks and price manipulation via URL tampering
 */
add_action('wp_ajax_gstore_add_fbt_to_cart', 'gstore_add_fbt_to_cart_ajax');
add_action('wp_ajax_nopriv_gstore_add_fbt_to_cart', 'gstore_add_fbt_to_cart_ajax');
function gstore_add_fbt_to_cart_ajax(){
	// Verify nonce for CSRF protection - MUST match enqueue.php:271
	check_ajax_referer('gstore_epp_ajax', 'nonce');

	$product_id = absint($_POST['product_id'] ?? 0);
	$quantity = absint($_POST['quantity'] ?? 1);
	$source_product_id = absint($_POST['source_product_id'] ?? 0);

	if (!$product_id || !$source_product_id) {
		wp_send_json_error(['message' => 'Invalid product ID']);
		return;
	}

	$cart_item_data = [];

	// Handle FBT Gift
	if (isset($_POST['fbt_gift_price'])) {
		$custom_price = floatval($_POST['fbt_gift_price']);

		// Validate against configured gift metadata (check source product and group default)
		$gifts = get_post_meta($source_product_id, '_gstore_fbt_gifts', true);
		if (!is_array($gifts)) $gifts = [];

		// Also check group default if source product doesn't have gifts configured
		if (empty($gifts)) {
			$default_id = gstore_get_group_default_product_id($source_product_id);
			if ($default_id) {
				$gifts = get_post_meta($default_id, '_gstore_fbt_gifts', true);
				if (!is_array($gifts)) $gifts = [];
			}
		}

		$is_valid_gift = false;
		foreach ($gifts as $gift) {
			if (isset($gift['id']) && absint($gift['id']) === $product_id &&
			    isset($gift['price']) && floatval($gift['price']) === $custom_price) {
				$is_valid_gift = true;
				break;
			}
		}

		if ($is_valid_gift) {
			$cart_item_data['fbt_gift_source'] = $source_product_id;
			$cart_item_data['fbt_gift_price'] = $custom_price;
			$cart_item_data['unique_key'] = md5(microtime().rand());
		} else {
			wp_send_json_error(['message' => 'Invalid gift configuration']);
			return;
		}
	}
	// Handle FBT Offer
	elseif (isset($_POST['fbt_offer_price'])) {
		$offer_price = floatval($_POST['fbt_offer_price']);

		// Validate against configured offer metadata (check source product and group default)
		$offers = get_post_meta($source_product_id, '_gstore_fbt_offers', true);
		if (!is_array($offers)) $offers = [];

		// Also check group default if source product doesn't have offers configured
		if (empty($offers)) {
			$default_id = gstore_get_group_default_product_id($source_product_id);
			if ($default_id) {
				$offers = get_post_meta($default_id, '_gstore_fbt_offers', true);
				if (!is_array($offers)) $offers = [];
			}
		}

		$is_valid_offer = false;
		foreach ($offers as $offer) {
			if (isset($offer['id']) && absint($offer['id']) === $product_id &&
			    isset($offer['price']) && floatval($offer['price']) === $offer_price) {
				$is_valid_offer = true;
				break;
			}
		}

		if ($is_valid_offer && $offer_price > 0) {
			$cart_item_data['fbt_offer_price'] = $offer_price;
			$cart_item_data['fbt_source_product'] = $source_product_id;
			$cart_item_data['unique_key'] = md5(microtime().rand());
		} else {
			wp_send_json_error(['message' => 'Invalid offer configuration']);
			return;
		}
	}
	// Handle regular FBT item (no custom pricing)
	else {
		// Regular FBT items just get added normally with unique key
		$cart_item_data['unique_key'] = md5(microtime().rand());
	}

	// Add to cart
	$cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, 0, [], $cart_item_data);

	if ($cart_item_key) {
		wp_send_json_success(['cart_item_key' => $cart_item_key]);
	} else {
		wp_send_json_error(['message' => 'Failed to add to cart']);
	}
}

/**
 * Add custom cart item data to track FBT gifts and offers
 * This runs when products are added to cart
 * SECURITY: Only accepts $_POST to prevent CSRF via GET URLs
 */
add_filter('woocommerce_add_cart_item_data', 'gstore_fbt_add_cart_item_data', 10, 3);
function gstore_fbt_add_cart_item_data($cart_item_data, $product_id, $variation_id){
	// SECURITY: Only check $_POST (not $_REQUEST) to prevent CSRF attacks via GET
	// FBT items MUST go through secure AJAX endpoint with nonce verification

	// Check if this product is being added as an FBT gift
	if (isset($_POST['fbt_gift_source']) && isset($_POST['fbt_gift_price'])){
		$source_product_id = absint($_POST['fbt_gift_source']);
		$custom_price = floatval($_POST['fbt_gift_price']);

		// Verify this is actually configured as a gift from source product (check source and group default)
		$gifts = get_post_meta($source_product_id, '_gstore_fbt_gifts', true);
		if (!is_array($gifts)) $gifts = [];

		// Also check group default if source product doesn't have gifts configured
		if (empty($gifts)) {
			$default_id = gstore_get_group_default_product_id($source_product_id);
			if ($default_id) {
				$gifts = get_post_meta($default_id, '_gstore_fbt_gifts', true);
				if (!is_array($gifts)) $gifts = [];
			}
		}

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
	// Check if this product is being added as an FBT offer
	// SECURITY: Only check $_POST (not $_REQUEST) to prevent CSRF attacks via GET
	elseif (isset($_POST['fbt_offer_price']) && isset($_POST['fbt_source_product'])){
		$source_product_id = absint($_POST['fbt_source_product']);
		$offer_price = floatval($_POST['fbt_offer_price']);

		// CRITICAL SECURITY: Validate offer price against source product metadata (check source and group default)
		$offers = get_post_meta($source_product_id, '_gstore_fbt_offers', true);
		if (!is_array($offers)) $offers = [];

		// Also check group default if source product doesn't have offers configured
		if (empty($offers)) {
			$default_id = gstore_get_group_default_product_id($source_product_id);
			if ($default_id) {
				$offers = get_post_meta($default_id, '_gstore_fbt_offers', true);
				if (!is_array($offers)) $offers = [];
			}
		}

		$is_valid_offer = false;
		foreach ($offers as $offer) {
			if (isset($offer['id']) && absint($offer['id']) === $product_id &&
			    isset($offer['price']) && floatval($offer['price']) === $offer_price) {
				$is_valid_offer = true;
				break;
			}
		}

		// Only apply custom price if it matches configured offer price
		if ($is_valid_offer && $offer_price > 0) {
			$cart_item_data['fbt_offer_price'] = $offer_price;
			$cart_item_data['fbt_source_product'] = $source_product_id;
			$cart_item_data['unique_key'] = md5(microtime().rand());
		}
	}

	return $cart_item_data;
}

/**
 * Apply custom pricing to FBT gifts and offers in cart
 * This runs before cart totals are calculated
 * Priority 1 ensures it runs before other calculations
 */
add_action('woocommerce_before_calculate_totals', 'gstore_fbt_apply_custom_pricing', 1, 1);
function gstore_fbt_apply_custom_pricing($cart){
	if (is_admin() && !defined('DOING_AJAX')) return;
	if (did_action('woocommerce_before_calculate_totals') >= 2) return;

	foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
		// Check if this is an FBT gift with custom pricing
		if (isset($cart_item['fbt_gift_price']) && isset($cart_item['fbt_gift_source'])) {
			$custom_price = floatval($cart_item['fbt_gift_price']);
			$cart_item['data']->set_price($custom_price);
		}
		// Check if this is an FBT offer with special pricing
		elseif (isset($cart_item['fbt_offer_price'])) {
			$offer_price = floatval($cart_item['fbt_offer_price']);
			$cart_item['data']->set_price($offer_price);
		}
	}
}

/**
 * Display the discounted price in cart item price column
 * This ensures the offer price shows in cart, not just checkout
 */
add_filter('woocommerce_cart_item_price', 'gstore_fbt_cart_item_price', 10, 3);
function gstore_fbt_cart_item_price($price, $cart_item, $cart_item_key){
	// For FBT offers, show both original and discounted price
	if (isset($cart_item['fbt_offer_price'])) {
		$offer_price = floatval($cart_item['fbt_offer_price']);
		$original_price = floatval($cart_item['data']->get_regular_price());

		if ($original_price > $offer_price) {
			return '<del>' . wc_price($original_price) . '</del> <ins>' . wc_price($offer_price) . '</ins>';
		}
		return wc_price($offer_price);
	}
	// For FBT gifts, show custom price (could be 0 for free gifts)
	elseif (isset($cart_item['fbt_gift_price'])) {
		$gift_price = floatval($cart_item['fbt_gift_price']);
		$original_price = floatval($cart_item['data']->get_regular_price());

		if ($original_price > $gift_price) {
			return '<del>' . wc_price($original_price) . '</del> <ins>' . wc_price($gift_price) . '</ins>';
		}
		return wc_price($gift_price);
	}

	return $price;
}

/**
 * Display the correct subtotal for FBT items in cart
 */
add_filter('woocommerce_cart_item_subtotal', 'gstore_fbt_cart_item_subtotal', 10, 3);
function gstore_fbt_cart_item_subtotal($subtotal, $cart_item, $cart_item_key){
	// For FBT offers, calculate subtotal with offer price
	if (isset($cart_item['fbt_offer_price'])) {
		$offer_price = floatval($cart_item['fbt_offer_price']);
		$quantity = $cart_item['quantity'];
		return wc_price($offer_price * $quantity);
	}
	// For FBT gifts, calculate subtotal with gift price
	elseif (isset($cart_item['fbt_gift_price'])) {
		$gift_price = floatval($cart_item['fbt_gift_price']);
		$quantity = $cart_item['quantity'];
		return wc_price($gift_price * $quantity);
	}

	return $subtotal;
}

/**
 * Display FBT gift/offer indicator in cart
 */
add_filter('woocommerce_cart_item_name', 'gstore_fbt_cart_item_name', 10, 3);
function gstore_fbt_cart_item_name($product_name, $cart_item, $cart_item_key){
	if (isset($cart_item['fbt_gift_source'])) {
		$source_product = wc_get_product($cart_item['fbt_gift_source']);
		if ($source_product) {
			$product_name .= '<br><small style="color:#ff9800;">🎁 Gift with ' . esc_html($source_product->get_name()) . '</small>';
		}
	}
	elseif (isset($cart_item['fbt_offer_price'])) {
		$product_name .= '<br><small style="color:#9c27b0;">🔥 Special Offer</small>';
	}
	return $product_name;
}

/**
 * Pass FBT data through checkout for order meta display
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
	elseif (isset($cart_item['fbt_offer_price'])) {
		$item_data[] = array(
			'key'   => 'Promotion',
			'value' => 'Special Offer'
		);
	}
	return $item_data;
}

/**
 * Save FBT data to order item meta
 */
add_action('woocommerce_checkout_create_order_line_item', 'gstore_fbt_order_item_meta', 10, 4);
function gstore_fbt_order_item_meta($item, $cart_item_key, $values, $order){
	if (isset($values['fbt_gift_source'])) {
		$item->add_meta_data('_fbt_gift_source', $values['fbt_gift_source']);
		$item->add_meta_data('_fbt_gift_price', $values['fbt_gift_price']);
	}
	elseif (isset($values['fbt_offer_price'])) {
		$item->add_meta_data('_fbt_offer_price', $values['fbt_offer_price']);
	}
}

/**
 * Helper function to get group default product ID for a given product
 * Used for validating FBT items that may be inherited from group default
 */
function gstore_get_group_default_product_id($product_id){
	if (!function_exists('gstore_epp_parse_by_product_id')) {
		return 0;
	}

	$ctx = gstore_epp_parse_by_product_id($product_id);
	if (empty($ctx['model'])) {
		return 0;
	}

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

	$default_id = 0;
	if ($q->have_posts()){
		$default_id = $q->posts[0];
	}
	wp_reset_postdata();

	return $default_id;
}
