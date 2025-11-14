<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/db.php';
require_once GSTORE_EPP_DIR.'includes/common/parse.php';

function gstore_epp_price_from_rules($pid, $tier, $new_battery){
	$ctx = gstore_epp_parse_by_product_id($pid);
	$storage = $ctx['storage'] ?: '';
	$storage_normalized = strtolower(preg_replace('~[^a-z0-9]~','', $storage));
	$group_key = trim($ctx['group_key'] . ($storage_normalized ? (' ' . $storage_normalized) : ''));
	global $wpdb;
	$row = $wpdb->get_row($wpdb->prepare('SELECT pricing_json FROM '.gstore_epp_table_rules().' WHERE group_key=%s LIMIT 1', $group_key), ARRAY_A);
	if (!$row) return null;
	$pricing = json_decode($row['pricing_json'], true);
	if (!is_array($pricing)) return null;
	$base = 0.0;
	if ($tier && !empty($pricing[$tier])){
		$r = floatval($pricing[$tier]['regular'] ?? 0);
		$s = floatval($pricing[$tier]['sale'] ?? 0);
		$base = ($s>0 && $s<$r) ? $s : $r;
	}
	if ($new_battery && !empty($pricing['new_battery'])){
		$nb_r = floatval($pricing['new_battery']['regular'] ?? 0);
		$nb_s = floatval($pricing['new_battery']['sale'] ?? 0);
		$base += ($nb_s>0 && $nb_s<$nb_r) ? $nb_s : $nb_r;
	}
	return $base>0 ? $base : null;
}

function gstore_epp_add_to_cart_core(){
	try{
		check_ajax_referer('gstore_epp_ajax', 'nonce');
		$pid = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
		$qty = isset($_POST['quantity']) ? max(1, absint($_POST['quantity'])) : 1;
		if (!$pid || !wc_get_product($pid)) throw new Exception('INVALID_PRODUCT');

		$cond = isset($_POST['condition']) ? sanitize_text_field($_POST['condition']) : '';
		$tier = isset($_POST['tier']) ? sanitize_text_field($_POST['tier']) : '';
		$new_battery = !empty($_POST['new_battery']);
		$addons = isset($_POST['laptop_addons']) ? json_decode(stripslashes($_POST['laptop_addons']), true) : [];
		if (!is_array($addons)) $addons = [];

		$calculated_price = null;
		if ($cond === 'used') {
			$calculated_price = gstore_epp_price_from_rules($pid, $tier, $new_battery);
		}

		$cart_item_data = [
			'gstore_cond' => $cond,
			'gstore_tier' => $tier,
			'gstore_new_battery' => $new_battery ? 'yes' : 'no',
			'gstore_addons' => $addons,
		];
		if ($calculated_price !== null) {
			$cart_item_data['gstore_calculated_price'] = $calculated_price;
		}

		$cart_item_key = WC()->cart->add_to_cart($pid, $qty, 0, [], $cart_item_data);
		if (!$cart_item_key) throw new Exception('NOT_PURCHASABLE');

		wp_send_json_success(['ok'=>true]);
	} catch(\Throwable $e){
		gstore_log_error('add_to_cart_failed', ['msg'=>$e->getMessage()]);
		wp_send_json_error(['ok'=>false,'error'=>$e->getMessage()], 400);
	}
}

add_action('wp_ajax_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');
add_action('wp_ajax_nopriv_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');

/** Apply price overrides in cart **/
add_action('woocommerce_before_calculate_totals', function($cart){
	if (is_admin() && !defined('DOING_AJAX')) return;
	if (empty($cart)) return;
	foreach ($cart->get_cart() as $key => $item){
		if (isset($item['gstore_calculated_price']) && $item['gstore_calculated_price']>0){
			$item['data']->set_price( (float) $item['gstore_calculated_price'] );
		}
		// Laptop add-ons price sum
		if (!empty($item['gstore_addons']) && is_array($item['gstore_addons'])){
			$sum = 0.0;
			$addons = $item['gstore_addons'];
			// Expect BOOT to pass priced items later; for now accept meta 'totals'
			if (!empty($addons['total'])){ $sum += floatval($addons['total']); }
			if ($sum>0){ $item['data']->set_price( ((float)$item['data']->get_price()) + $sum ); }
		}
	}
}, 20);

/** Display custom meta in cart **/
add_filter('woocommerce_get_item_data', function($item_data, $cart_item){
	if (empty($cart_item)) return $item_data;

	// Condition
	if (!empty($cart_item['gstore_cond'])){
		$cond_label = strtoupper($cart_item['gstore_cond']);
		if ($cart_item['gstore_cond'] === 'used') $cond_label = 'USED (A)';
		$item_data[] = [
			'key' => __('Condition', 'gstore-epp'),
			'value' => $cond_label
		];
	}

	// Battery Tier (only for used condition)
	if (!empty($cart_item['gstore_tier']) && $cart_item['gstore_cond'] === 'used'){
		$item_data[] = [
			'key' => __('Battery Health', 'gstore-epp'),
			'value' => $cart_item['gstore_tier'] . '%'
		];
	}

	// New Battery
	if (!empty($cart_item['gstore_new_battery']) && $cart_item['gstore_new_battery'] === 'yes'){
		$item_data[] = [
			'key' => __('New Battery', 'gstore-epp'),
			'value' => __('Added', 'gstore-epp')
		];
	}

	// Laptop Add-ons
	if (!empty($cart_item['gstore_addons']) && is_array($cart_item['gstore_addons'])){
		$addons = $cart_item['gstore_addons'];
		if (!empty($addons['ram'])){
			$item_data[] = [
				'key' => __('RAM Upgrade', 'gstore-epp'),
				'value' => $addons['ram']['label'] ?? $addons['ram']['value']
			];
		}
		if (!empty($addons['storage'])){
			$item_data[] = [
				'key' => __('Storage Upgrade', 'gstore-epp'),
				'value' => $addons['storage']['label'] ?? $addons['storage']['value']
			];
		}
	}

	return $item_data;
}, 10, 2);

/** Save custom meta to order items **/
add_action('woocommerce_checkout_create_order_line_item', function($item, $cart_item_key, $values, $order){
	if (empty($values)) return;

	// Save condition
	if (!empty($values['gstore_cond'])){
		$cond_label = strtoupper($values['gstore_cond']);
		if ($values['gstore_cond'] === 'used') $cond_label = 'USED (A)';
		$item->add_meta_data(__('Condition', 'gstore-epp'), $cond_label, true);
	}

	// Save battery tier
	if (!empty($values['gstore_tier']) && $values['gstore_cond'] === 'used'){
		$item->add_meta_data(__('Battery Health', 'gstore-epp'), $values['gstore_tier'] . '%', true);
	}

	// Save new battery
	if (!empty($values['gstore_new_battery']) && $values['gstore_new_battery'] === 'yes'){
		$item->add_meta_data(__('New Battery', 'gstore-epp'), __('Added', 'gstore-epp'), true);
	}

	// Save laptop add-ons
	if (!empty($values['gstore_addons']) && is_array($values['gstore_addons'])){
		$addons = $values['gstore_addons'];
		if (!empty($addons['ram'])){
			$item->add_meta_data(__('RAM Upgrade', 'gstore-epp'), $addons['ram']['label'] ?? $addons['ram']['value'], true);
		}
		if (!empty($addons['storage'])){
			$item->add_meta_data(__('Storage Upgrade', 'gstore-epp'), $addons['storage']['label'] ?? $addons['storage']['value'], true);
		}
	}
}, 10, 4);