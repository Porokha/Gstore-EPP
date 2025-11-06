<?php
if (!defined('ABSPATH')) { exit; }

function gstore_epp_add_to_cart_core(){
	try{
		check_ajax_referer('gstore_epp_ajax', 'nonce');
		if (!isset($_POST['product_id'])) throw new Exception('MISSING_PRODUCT_ID');
		$pid = absint($_POST['product_id']);
		$qty = isset($_POST['quantity']) ? max(1, absint($_POST['quantity'])) : 1;

		if (!$pid || !wc_get_product($pid)) throw new Exception('INVALID_PRODUCT');
		$added = WC()->cart->add_to_cart($pid, $qty);
		if (!$added) throw new Exception('NOT_PURCHASABLE');
		wp_send_json_success(['ok'=>true]);
	} catch(\Throwable $e){
		gstore_log_error('add_to_cart_failed', ['msg'=>$e->getMessage()]);
		wp_send_json_error(['ok'=>false,'error'=>$e->getMessage()], 400);
	}
}

add_action('wp_ajax_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');
add_action('wp_ajax_nopriv_gstore_epp_add_to_cart', 'gstore_epp_add_to_cart_core');
