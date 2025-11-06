<?php
/**
 * AJAX Handler - FIXED VERSION
 * Gstore EPP - Add to Cart with Pricing Rules
 *
 * FIXES:
 * - Applies pricing rule prices to cart items
 * - Stores tier, battery, and add-on selections in cart meta
 * - Overrides cart display prices
 * - Shows selections in cart/checkout
 */

if (!defined('ABSPATH')) exit;

// Register AJAX actions
add_action('wp_ajax_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');
add_action('wp_ajax_nopriv_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');

/**
 * Main Add to Cart Handler - FIXED
 */
function gstore_epp_add_to_cart_core() {
	try {
		// Verify nonce
		check_ajax_referer('gstore_epp_ajax', 'nonce');

		// Get product ID and quantity
		$pid = absint($_POST['product_id'] ?? 0);
		$qty = isset($_POST['quantity']) ? max(1, absint($_POST['quantity'])) : 1;

		if (!$pid) {
			throw new Exception('INVALID_PRODUCT_ID');
		}

		// Get product
		$product = wc_get_product($pid);
		if (!$product || !$product->is_purchasable()) {
			throw new Exception('NOT_PURCHASABLE');
		}

		// ============================================
		// EXTRACT USER SELECTIONS FROM AJAX REQUEST
		// ============================================
		$condition = sanitize_text_field($_POST['condition'] ?? 'new'); // 'new' or 'used'
		$selected_tier = sanitize_text_field($_POST['tier'] ?? ''); // e.g., "90-95"
		$new_battery = !empty($_POST['new_battery']); // boolean
		$fbt_ids = !empty($_POST['fbt_ids']) ? array_map('absint', (array)$_POST['fbt_ids']) : [];

		// Laptop add-ons
		$laptop_ram = !empty($_POST['laptop_ram']) ? json_decode(stripslashes($_POST['laptop_ram']), true) : [];
		$laptop_storage = !empty($_POST['laptop_storage']) ? json_decode(stripslashes($_POST['laptop_storage']), true) : [];

		// ============================================
		// CALCULATE PRICE BASED ON SELECTIONS
		// ============================================
		$calculated_price = 0;
		$price_breakdown = [];
		$device_type = gstore_epp_device_type($pid);

		// Load attribute data
		require_once plugin_dir_path(__FILE__) . '../common/parse.php';
		$ctx = gstore_epp_parse_by_product_id($pid);

		// Get pricing rules for this product
		global $wpdb;
		$table = $wpdb->prefix . 'gstore_model_rules';
		$group_key = $ctx['group_key'];

		$rule = $wpdb->get_row($wpdb->prepare(
			"SELECT * FROM {$table} WHERE group_key = %s LIMIT 1",
			$group_key
		), ARRAY_A);

		// Parse pricing JSON
		$pricing = [];
		if ($rule && !empty($rule['pricing_json'])) {
			$pricing = json_decode($rule['pricing_json'], true);
		}

		// ============================================
		// PHONE PRICING LOGIC
		// ============================================
		if ($device_type === 'phone') {
			if ($condition === 'new' || empty($pricing)) {
				// Use WooCommerce base price for NEW phones or if no rules
				$calculated_price = (float)$product->get_price();
				$price_breakdown['base'] = $calculated_price;
			} else {
				// USED phone - use pricing rule
				if ($selected_tier && isset($pricing[$selected_tier])) {
					$tier_data = $pricing[$selected_tier];
					$tier_price = !empty($tier_data['sale']) ? (float)$tier_data['sale'] : (float)$tier_data['regular'];
					$calculated_price = $tier_price;
					$price_breakdown['base'] = $tier_price;
					$price_breakdown['tier'] = $selected_tier;

					// Add new battery if selected
					if ($new_battery && isset($pricing['new_battery'])) {
						$battery_data = $pricing['new_battery'];
						$battery_price = !empty($battery_data['sale']) ? (float)$battery_data['sale'] : (float)$battery_data['regular'];
						$calculated_price += $battery_price;
						$price_breakdown['new_battery'] = $battery_price;
					}
				} else {
					// No tier selected but USED - use base price as fallback
					$calculated_price = (float)$product->get_price();
					$price_breakdown['base'] = $calculated_price;
				}
			}
		}

		// ============================================
		// LAPTOP PRICING LOGIC
		// ============================================
		if ($device_type === 'laptop') {
			// Start with base product price
			$calculated_price = (float)$product->get_price();
			$price_breakdown['base'] = $calculated_price;

			// Load laptop add-ons from database
			$laptop_addons_table = $wpdb->prefix . 'gstore_laptop_addons';

			// Get RAM add-ons
			$ram_data = $wpdb->get_var("SELECT data_json FROM {$laptop_addons_table} WHERE scope = 'laptop_ram' LIMIT 1");
			$ram_addons = $ram_data ? json_decode($ram_data, true) : [];

			// Get Storage add-ons
			$storage_data = $wpdb->get_var("SELECT data_json FROM {$laptop_addons_table} WHERE scope = 'laptop_storage' LIMIT 1");
			$storage_addons = $storage_data ? json_decode($storage_data, true) : [];

			// Calculate RAM add-on prices
			$ram_total = 0;
			if (!empty($laptop_ram)) {
				foreach ($laptop_ram as $ram_key) {
					foreach ($ram_addons as $addon) {
						if ($addon['key'] === $ram_key) {
							$ram_total += (float)$addon['price'];
						}
					}
				}
			}
			if ($ram_total > 0) {
				$calculated_price += $ram_total;
				$price_breakdown['ram_addons'] = $ram_total;
			}

			// Calculate Storage add-on prices
			$storage_total = 0;
			if (!empty($laptop_storage)) {
				foreach ($laptop_storage as $storage_key) {
					foreach ($storage_addons as $addon) {
						if ($addon['key'] === $storage_key) {
							$storage_total += (float)$addon['price'];
						}
					}
				}
			}
			if ($storage_total > 0) {
				$calculated_price += $storage_total;
				$price_breakdown['storage_addons'] = $storage_total;
			}
		}

		// ============================================
		// ADD TO CART WITH CUSTOM DATA
		// ============================================
		$cart_item_data = [
			'gstore_epp_data' => [
				'condition' => $condition,
				'device_type' => $device_type,
				'calculated_price' => $calculated_price,
				'price_breakdown' => $price_breakdown,
			]
		];

		// Add phone-specific data
		if ($device_type === 'phone') {
			$cart_item_data['gstore_epp_data']['tier'] = $selected_tier;
			$cart_item_data['gstore_epp_data']['new_battery'] = $new_battery;
		}

		// Add laptop-specific data
		if ($device_type === 'laptop') {
			$cart_item_data['gstore_epp_data']['laptop_ram'] = $laptop_ram;
			$cart_item_data['gstore_epp_data']['laptop_storage'] = $laptop_storage;
		}

		// Add main product to cart
		$cart_item_key = WC()->cart->add_to_cart($pid, $qty, 0, [], $cart_item_data);

		if (!$cart_item_key) {
			throw new Exception('FAILED_TO_ADD_TO_CART');
		}

		// ============================================
		// ADD FBT PRODUCTS TO CART
		// ============================================
		$fbt_added = [];
		if (!empty($fbt_ids)) {
			foreach ($fbt_ids as $fbt_id) {
				$fbt_product = wc_get_product($fbt_id);
				if ($fbt_product && $fbt_product->is_purchasable()) {
					$fbt_key = WC()->cart->add_to_cart($fbt_id, 1);
					if ($fbt_key) {
						$fbt_added[] = $fbt_id;
					}
				}
			}
		}

		// Success response
		wp_send_json_success([
			'ok' => true,
			'message' => 'Product added to cart',
			'cart_item_key' => $cart_item_key,
			'calculated_price' => $calculated_price,
			'fbt_added' => $fbt_added,
			'cart_url' => wc_get_cart_url(),
			'cart_count' => WC()->cart->get_cart_contents_count()
		]);

	} catch (Exception $e) {
		wp_send_json_error([
			'ok' => false,
			'message' => $e->getMessage()
		]);
	}
}

// ============================================
// CART PRICE OVERRIDE - Display calculated price
// ============================================
add_filter('woocommerce_cart_item_price', 'gstore_epp_override_cart_price', 10, 3);
function gstore_epp_override_cart_price($price_html, $cart_item, $cart_item_key) {
	if (isset($cart_item['gstore_epp_data']['calculated_price'])) {
		$calculated_price = $cart_item['gstore_epp_data']['calculated_price'];
		return wc_price($calculated_price);
	}
	return $price_html;
}

// ============================================
// CART ITEM PRICE CALCULATION - Apply to totals
// ============================================
add_action('woocommerce_before_calculate_totals', 'gstore_epp_override_cart_item_price', 10, 1);
function gstore_epp_override_cart_item_price($cart) {
	if (is_admin() && !defined('DOING_AJAX')) return;
	if (did_action('woocommerce_before_calculate_totals') >= 2) return;

	foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
		if (isset($cart_item['gstore_epp_data']['calculated_price'])) {
			$calculated_price = $cart_item['gstore_epp_data']['calculated_price'];
			$cart_item['data']->set_price($calculated_price);
		}
	}
}

// ============================================
// DISPLAY META IN CART/CHECKOUT
// ============================================
add_filter('woocommerce_get_item_data', 'gstore_epp_display_cart_meta', 10, 2);
function gstore_epp_display_cart_meta($item_data, $cart_item) {
	if (!isset($cart_item['gstore_epp_data'])) {
		return $item_data;
	}

	$data = $cart_item['gstore_epp_data'];
	$device_type = $data['device_type'] ?? '';

	// Display condition
	if (!empty($data['condition'])) {
		$item_data[] = [
			'key' => __('Condition', 'gstore-epp'),
			'value' => ucfirst($data['condition'])
		];
	}

	// Display phone-specific meta
	if ($device_type === 'phone') {
		if (!empty($data['tier']) && $data['condition'] === 'used') {
			$item_data[] = [
				'key' => __('Battery Health', 'gstore-epp'),
				'value' => $data['tier'] . '%'
			];
		}

		if (!empty($data['new_battery'])) {
			$breakdown = $data['price_breakdown'] ?? [];
			$battery_price = $breakdown['new_battery'] ?? 0;
			$item_data[] = [
				'key' => __('New Battery', 'gstore-epp'),
				'value' => sprintf(__('Yes (+%s)', 'gstore-epp'), wc_price($battery_price))
			];
		}
	}

	// Display laptop-specific meta
	if ($device_type === 'laptop') {
		if (!empty($data['laptop_ram'])) {
			$item_data[] = [
				'key' => __('Additional RAM', 'gstore-epp'),
				'value' => implode(', ', $data['laptop_ram'])
			];
		}

		if (!empty($data['laptop_storage'])) {
			$item_data[] = [
				'key' => __('Additional Storage', 'gstore-epp'),
				'value' => implode(', ', $data['laptop_storage'])
			];
		}
	}

	return $item_data;
}

// ============================================
// SAVE META TO ORDER
// ============================================
add_action('woocommerce_checkout_create_order_line_item', 'gstore_epp_save_order_meta', 10, 4);
function gstore_epp_save_order_meta($item, $cart_item_key, $values, $order) {
	if (isset($values['gstore_epp_data'])) {
		$data = $values['gstore_epp_data'];

		// Save condition
		if (!empty($data['condition'])) {
			$item->add_meta_data(__('Condition', 'gstore-epp'), ucfirst($data['condition']));
		}

		// Save phone data
		if ($data['device_type'] === 'phone') {
			if (!empty($data['tier'])) {
				$item->add_meta_data(__('Battery Health', 'gstore-epp'), $data['tier'] . '%');
			}
			if (!empty($data['new_battery'])) {
				$breakdown = $data['price_breakdown'] ?? [];
				$battery_price = $breakdown['new_battery'] ?? 0;
				$item->add_meta_data(__('New Battery', 'gstore-epp'), sprintf(__('Yes (+%s)', 'gstore-epp'), wc_price($battery_price)));
			}
		}

		// Save laptop data
		if ($data['device_type'] === 'laptop') {
			if (!empty($data['laptop_ram'])) {
				$item->add_meta_data(__('Additional RAM', 'gstore-epp'), implode(', ', $data['laptop_ram']));
			}
			if (!empty($data['laptop_storage'])) {
				$item->add_meta_data(__('Additional Storage', 'gstore-epp'), implode(', ', $data['laptop_storage']));
			}
		}

		// Save full data as JSON for debugging
		$item->add_meta_data('_gstore_epp_data', json_encode($data), true);
	}
}
