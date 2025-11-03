<?php
if (!defined('ABSPATH')) { exit; }

add_action('add_meta_boxes', function(){
    add_meta_box('gstore_fbt','Frequently Bought Together (up to 3)','gstore_fbt_box','product','side','default');
});

function gstore_fbt_box($post){
    $ids = get_post_meta($post->ID, '_gstore_fbt_ids', true);
    if (!is_array($ids)) $ids = [];
    wp_nonce_field('gstore_fbt_save','gstore_fbt_nonce');
    echo '<p>Select up to 3 product IDs (comma separated):</p>';
    echo '<input type="text" name="gstore_fbt_ids" value="'.esc_attr(implode(',', $ids)).'" style="width:100%">';
    echo '<p class="description">If empty, this product inherits from its default sibling. If none, random 3 from Accessories will be shown.</p>';
}

add_action('save_post_product', function($post_id){
    if (!isset($_POST['gstore_fbt_nonce']) || !wp_verify_nonce($_POST['gstore_fbt_nonce'],'gstore_fbt_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post',$post_id)) return;

    $raw = isset($_POST['gstore_fbt_ids']) ? $_POST['gstore_fbt_ids'] : '';
    $ids = array_filter(array_map('absint', array_map('trim', explode(',', $raw))));
    if (count($ids) > 3) $ids = array_slice($ids, 0, 3);
    update_post_meta($post_id, '_gstore_fbt_ids', $ids);
});
