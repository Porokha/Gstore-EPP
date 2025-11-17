<?php
if (!defined('ABSPATH')) { exit; }

add_action('add_meta_boxes', function(){
	add_meta_box('gstore_fbt','Frequently Bought Together','gstore_fbt_box','product','side','default');
});

function gstore_fbt_box($post){
	$ids = get_post_meta($post->ID, '_gstore_fbt_ids', true);
	if (!is_array($ids)) $ids = [];

	$gifts = get_post_meta($post->ID, '_gstore_fbt_gifts', true);
	if (!is_array($gifts)) $gifts = [];

	$offers = get_post_meta($post->ID, '_gstore_fbt_offers', true);
	if (!is_array($offers)) $offers = [];

	$is_default = get_post_meta($post->ID, '_gstore_is_group_default', true) === 'yes';

	wp_nonce_field('gstore_fbt_save','gstore_fbt_nonce');

	echo '<div style="margin-bottom:12px;">';
	echo '<label><input type="checkbox" name="gstore_is_group_default" value="yes" '.checked($is_default, true, false).'> ';
	echo '<strong>Set as group default</strong></label>';
	echo '<p class="description">If checked, other products in this model will inherit these FBT items.</p>';
	echo '</div>';

	echo '<hr style="margin:12px 0;">';

	// Regular FBT
	echo '<div style="margin-bottom:20px;">';
	echo '<p style="margin:0 0 8px 0;"><strong>🛒 Regular FBT Products:</strong></p>';
	echo '<input type="text" name="gstore_fbt_ids" value="'.esc_attr(implode(',', $ids)).'" style="width:100%" placeholder="Enter product IDs (comma separated)">';
	echo '<p class="description">Optional products users can select. Displays in grid (3 per row). If empty, inherits from group default.</p>';
	echo '</div>';

	echo '<hr style="margin:12px 0;">';

	// FBT Gifts
	echo '<div style="margin-bottom:20px;">';
	echo '<p style="margin:0 0 8px 0;"><strong>🎁 FBT Gifts (Auto-Selected):</strong></p>';
	echo '<div id="gstore-fbt-gifts-list">';
	if (!empty($gifts)) {
		foreach ($gifts as $index => $gift) {
			$product_id = $gift['id'] ?? '';
			$custom_price = $gift['price'] ?? '';
			echo '<div class="gstore-fbt-gift-row" style="display:flex;gap:8px;margin-bottom:8px;">';
			echo '<input type="number" name="gstore_fbt_gifts['.$index.'][id]" value="'.esc_attr($product_id).'" placeholder="Product ID" style="width:40%;" min="1">';
			echo '<input type="number" name="gstore_fbt_gifts['.$index.'][price]" value="'.esc_attr($custom_price).'" placeholder="Custom Price (₾)" style="width:40%;" step="0.01" min="0">';
			echo '<button type="button" class="button gstore-remove-gift" style="width:20%;">Remove</button>';
			echo '</div>';
		}
	}
	echo '</div>';
	echo '<button type="button" id="gstore-add-gift" class="button" style="margin-top:8px;">+ Add Gift</button>';
	echo '<p class="description">Gifts are automatically selected. Custom price applies ONLY when added from this product page.</p>';
	echo '</div>';

	echo '<hr style="margin:12px 0;">';

	// FBT Offers
	echo '<div style="margin-bottom:20px;">';
	echo '<p style="margin:0 0 8px 0;"><strong>🔥 FBT Offers (Exit-Intent Popup):</strong></p>';
	echo '<div id="gstore-fbt-offers-list">';
	if (!empty($offers)) {
		foreach ($offers as $index => $offer) {
			$product_id = $offer['id'] ?? '';
			$offer_price = $offer['price'] ?? '';
			echo '<div class="gstore-fbt-offer-row" style="display:flex;gap:8px;margin-bottom:8px;">';
			echo '<input type="number" name="gstore_fbt_offers['.$index.'][id]" value="'.esc_attr($product_id).'" placeholder="Product ID" style="width:40%;" min="1">';
			echo '<input type="number" name="gstore_fbt_offers['.$index.'][price]" value="'.esc_attr($offer_price).'" placeholder="Offer Price (₾)" style="width:40%;" step="0.01" min="0">';
			echo '<button type="button" class="button gstore-remove-offer" style="width:20%;">Remove</button>';
			echo '</div>';
		}
	}
	echo '</div>';
	echo '<button type="button" id="gstore-add-offer" class="button" style="margin-top:8px;">+ Add Offer</button>';
	echo '<p class="description">Shows popup when user tries to leave page or clicks "Buy Now". Displays original price + offer price. Priority over regular FBT.</p>';
	echo '</div>';

	// JavaScript for add/remove buttons
	?>
	<script>
	jQuery(document).ready(function($){
		// Add Gift
		$('#gstore-add-gift').on('click', function(){
			var index = $('#gstore-fbt-gifts-list .gstore-fbt-gift-row').length;
			var html = '<div class="gstore-fbt-gift-row" style="display:flex;gap:8px;margin-bottom:8px;">' +
				'<input type="number" name="gstore_fbt_gifts[' + index + '][id]" placeholder="Product ID" style="width:40%;" min="1">' +
				'<input type="number" name="gstore_fbt_gifts[' + index + '][price]" placeholder="Custom Price (₾)" style="width:40%;" step="0.01" min="0">' +
				'<button type="button" class="button gstore-remove-gift" style="width:20%;">Remove</button>' +
				'</div>';
			$('#gstore-fbt-gifts-list').append(html);
		});

		// Remove Gift
		$(document).on('click', '.gstore-remove-gift', function(){
			$(this).closest('.gstore-fbt-gift-row').remove();
		});

		// Add Offer
		$('#gstore-add-offer').on('click', function(){
			var index = $('#gstore-fbt-offers-list .gstore-fbt-offer-row').length;
			var html = '<div class="gstore-fbt-offer-row" style="display:flex;gap:8px;margin-bottom:8px;">' +
				'<input type="number" name="gstore_fbt_offers[' + index + '][id]" placeholder="Product ID" style="width:40%;" min="1">' +
				'<input type="number" name="gstore_fbt_offers[' + index + '][price]" placeholder="Offer Price (₾)" style="width:40%;" step="0.01" min="0">' +
				'<button type="button" class="button gstore-remove-offer" style="width:20%;">Remove</button>' +
				'</div>';
			$('#gstore-fbt-offers-list').append(html);
		});

		// Remove Offer
		$(document).on('click', '.gstore-remove-offer', function(){
			$(this).closest('.gstore-fbt-offer-row').remove();
		});
	});
	</script>
	<?php
}

add_action('save_post_product', function($post_id){
	if (!isset($_POST['gstore_fbt_nonce']) || !wp_verify_nonce($_POST['gstore_fbt_nonce'],'gstore_fbt_save')) return;
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
	if (!current_user_can('edit_post',$post_id)) return;

	// Save FBT IDs (remove 3-product limit)
	$raw = isset($_POST['gstore_fbt_ids']) ? $_POST['gstore_fbt_ids'] : '';
	$ids = array_filter(array_map('absint', array_map('trim', explode(',', $raw))));
	update_post_meta($post_id, '_gstore_fbt_ids', $ids);

	// Save FBT Gifts
	$gifts = [];
	if (isset($_POST['gstore_fbt_gifts']) && is_array($_POST['gstore_fbt_gifts'])) {
		foreach ($_POST['gstore_fbt_gifts'] as $gift) {
			$gift_id = isset($gift['id']) ? absint($gift['id']) : 0;
			$gift_price = isset($gift['price']) ? floatval($gift['price']) : 0;
			if ($gift_id > 0 && $gift_price >= 0) {
				$gifts[] = ['id' => $gift_id, 'price' => $gift_price];
			}
		}
	}
	update_post_meta($post_id, '_gstore_fbt_gifts', $gifts);

	// Save FBT Offers
	$offers = [];
	if (isset($_POST['gstore_fbt_offers']) && is_array($_POST['gstore_fbt_offers'])) {
		foreach ($_POST['gstore_fbt_offers'] as $offer) {
			$offer_id = isset($offer['id']) ? absint($offer['id']) : 0;
			$offer_price = isset($offer['price']) ? floatval($offer['price']) : 0;
			if ($offer_id > 0 && $offer_price >= 0) {
				$offers[] = ['id' => $offer_id, 'price' => $offer_price];
			}
		}
	}
	update_post_meta($post_id, '_gstore_fbt_offers', $offers);

	// Handle group default
	$is_default = isset($_POST['gstore_is_group_default']) && $_POST['gstore_is_group_default'] === 'yes';

	if ($is_default){
		// Clear previous default in the same group
		$ctx = function_exists('gstore_epp_parse_by_product_id')
			? gstore_epp_parse_by_product_id($post_id)
			: [];

		if (!empty($ctx['group_key'])){
			// Find all products in same group
			$q = new WP_Query([
				'post_type'=>'product',
				'posts_per_page'=>-1,
				'post_status'=>'any',
				'post__not_in'=>[$post_id],
				'fields'=>'ids'
			]);

			if ($q->have_posts()){
				foreach($q->posts as $other_id){
					$other_ctx = function_exists('gstore_epp_parse_by_product_id')
						? gstore_epp_parse_by_product_id($other_id)
						: [];

					if (!empty($other_ctx['group_key']) && $other_ctx['group_key'] === $ctx['group_key']){
						delete_post_meta($other_id, '_gstore_is_group_default');
					}
				}
			}
			wp_reset_postdata();
		}

		update_post_meta($post_id, '_gstore_is_group_default', 'yes');
		gstore_log_debug('fbt_group_default_set', ['pid'=>$post_id,'group_key'=>$ctx['group_key']??'']);
	} else {
		delete_post_meta($post_id, '_gstore_is_group_default');
	}
});
