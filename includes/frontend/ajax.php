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