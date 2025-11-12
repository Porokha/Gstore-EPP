<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Add meta box for product comparison specs
 */
add_action('add_meta_boxes', function(){
	add_meta_box('gstore_compare_specs','Product Comparison Specs','gstore_compare_specs_box','product','normal','default');
});

function gstore_compare_specs_box($post){
	$specs = get_post_meta($post->ID, '_gstore_compare_specs', true);
	if (!is_array($specs)) {
		$specs = [
			'CPU' => '',
			'GPU' => '',
			'Camera' => '',
			'Battery' => '',
			'Display' => '',
			'Build' => '',
			'Connectivity' => '',
			'Charging' => '',
			'Weight' => '',
			'Durability' => '',
			'Storage Speed' => '',
			'Thermals' => ''
		];
	}

	wp_nonce_field('gstore_compare_specs_save','gstore_compare_specs_nonce');

	echo '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;max-width:800px;">';

	$categories = ['CPU','GPU','Camera','Battery','Display','Build','Connectivity','Charging','Weight','Durability','Storage Speed','Thermals'];

	foreach($categories as $cat){
		$value = isset($specs[$cat]) ? $specs[$cat] : '';
		echo '<div style="display:flex;align-items:center;gap:10px;">';
		echo '<label style="min-width:120px;font-weight:600;">'.esc_html($cat).':</label>';
		echo '<input type="number" name="gstore_compare_specs['.esc_attr($cat).']" value="'.esc_attr($value).'" min="0" max="100" step="1" style="width:80px;" placeholder="0-100">';
		echo '<div style="flex:1;background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">';
		echo '<div style="background:#2563eb;height:100%;width:'.esc_attr($value).'%;transition:width 0.3s;"></div>';
		echo '</div>';
		echo '</div>';
	}

	echo '</div>';

	echo '<p class="description" style="margin-top:15px;">Enter scores from 0-100 for each category. These will be used in the Compare tab.</p>';
}

add_action('save_post_product', function($post_id){
	if (!isset($_POST['gstore_compare_specs_nonce']) || !wp_verify_nonce($_POST['gstore_compare_specs_nonce'],'gstore_compare_specs_save')) return;
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
	if (!current_user_can('edit_post',$post_id)) return;

	if (isset($_POST['gstore_compare_specs']) && is_array($_POST['gstore_compare_specs'])){
		$specs = [];
		foreach($_POST['gstore_compare_specs'] as $key => $value){
			$key = sanitize_text_field($key);
			$value = absint($value);
			if ($value > 100) $value = 100;
			$specs[$key] = $value;
		}
		update_post_meta($post_id, '_gstore_compare_specs', $specs);
	}
});
