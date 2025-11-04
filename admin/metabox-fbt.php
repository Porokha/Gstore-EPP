<?php
if (!defined('ABSPATH')) { exit; }

add_action('add_meta_boxes', function(){
	add_meta_box('gstore_fbt','Frequently Bought Together','gstore_fbt_box','product','side','default');
});

function gstore_fbt_box($post){
	$ids = get_post_meta($post->ID, '_gstore_fbt_ids', true);
	if (!is_array($ids)) $ids = [];

	$is_default = get_post_meta($post->ID, '_gstore_is_group_default', true) === 'yes';

	wp_nonce_field('gstore_fbt_save','gstore_fbt_nonce');

	echo '<div style="margin-bottom:12px;">';
	echo '<label><input type="checkbox" name="gstore_is_group_default" value="yes" '.checked($is_default, true, false).'> ';
	echo '<strong>Set as group default</strong></label>';
	echo '<p class="description">If checked, other products in this model will inherit these FBT items.</p>';
	echo '</div>';

	echo '<hr style="margin:12px 0;">';

	echo '<p><strong>Select up to 3 products:</strong></p>';
	echo '<input type="text" name="gstore_fbt_ids" value="'.esc_attr(implode(',', $ids)).'" style="width:100%" placeholder="Enter product IDs (comma separated)">';
	echo '<p class="description">If empty, this product inherits from its group default. If no default, random 3 from Accessories category will be shown.</p>';
}

add_action('save_post_product', function($post_id){
	if (!isset($_POST['gstore_fbt_nonce']) || !wp_verify_nonce($_POST['gstore_fbt_nonce'],'gstore_fbt_save')) return;
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
	if (!current_user_can('edit_post',$post_id)) return;

	// Save FBT IDs
	$raw = isset($_POST['gstore_fbt_ids']) ? $_POST['gstore_fbt_ids'] : '';
	$ids = array_filter(array_map('absint', array_map('trim', explode(',', $raw))));
	if (count($ids) > 3) $ids = array_slice($ids, 0, 3);
	update_post_meta($post_id, '_gstore_fbt_ids', $ids);

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