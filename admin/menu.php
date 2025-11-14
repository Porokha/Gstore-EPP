<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/db.php';
require_once GSTORE_EPP_DIR.'includes/common/parse.php';

// --- Menus
add_action('admin_menu', function(){
    add_menu_page('Gstore','Gstore','manage_woocommerce','gstore_root', function(){
        echo '<div class="wrap"><h1>Gstore</h1><p>Enhanced Product Page controls.</p></div>';
    }, 'dashicons-products', 56);

    add_submenu_page('gstore_root','Pricing Rules','Pricing Rules','manage_woocommerce','gstore_rules','gstore_rules_page');
    add_submenu_page('gstore_root','Global Add-ons','Global Add-ons','manage_woocommerce','gstore_addons','gstore_addons_page');
    add_submenu_page('gstore_root','Challenge Game','Challenge Game','manage_woocommerce','gstore_challenge','gstore_challenge_page');
    add_submenu_page('gstore_root','Debug & Logging','Debug & Logging','manage_woocommerce','gstore_debug','gstore_debug_page');
    add_submenu_page('gstore_root','Maintenance','Maintenance','manage_woocommerce','gstore_maint','gstore_maint_page');
});

// Register admin post actions
add_action('admin_post_gstore_save_rule','gstore_handle_save_rule');
add_action('admin_post_gstore_delete_rule','gstore_handle_delete_rule');
add_action('admin_post_gstore_clear_rules','gstore_handle_clear_rules');
add_action('admin_post_gstore_clear_pricing_cache','gstore_handle_clear_pricing_cache');
add_action('admin_post_gstore_save_addons','gstore_handle_save_addons');
add_action('admin_post_gstore_save_debug','gstore_handle_save_debug');
add_action('admin_post_gstore_save_challenge','gstore_handle_save_challenge');
add_action('admin_post_gstore_reset_challenge','gstore_handle_reset_challenge');

// --- Pricing Rules UI
function gstore_rules_page(){
    $action = isset($_GET['action']) ? sanitize_text_field($_GET['action']) : 'list';
    if ($action === 'edit') { gstore_rule_edit_page(); } else { gstore_rule_list_page(); }
}

function gstore_fetch_models_without_rule(){
    global $wpdb;
    $table = gstore_epp_table_rules();

    // Limit to 500 products for performance
    $q = new WP_Query([
            'post_type'=>'product',
            'posts_per_page'=>500,
            'post_status'=>'publish',
            'fields'=>'ids',
            'orderby'=>'modified',
            'order'=>'DESC'
    ]);

    $all = [];
    if ($q->have_posts()){
        foreach ($q->posts as $pid){
            $ctx = gstore_epp_parse_by_product_id($pid);
            if (!$ctx || !$ctx['group_key']) continue;

            // NEW: Include storage in the key
            $storage = $ctx['storage'] ?: '';
            $storage_normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $storage));

            if ($storage_normalized) {
                $full_key = $ctx['group_key'] . ' ' . $storage_normalized;
                $display_key = $ctx['group_key'] . ' - ' . strtoupper($storage);
            } else {
                $full_key = $ctx['group_key'];
                $display_key = $ctx['group_key'];
            }

            if (!isset($all[$full_key])) {
                $all[$full_key] = [
                        'group_key'=>$full_key,
                        'display_key'=>$display_key,
                        'device_type'=>$ctx['device_type'],
                        'storage'=>$storage
                ];
            }
        }
    }
    wp_reset_postdata();

    if (!$all) return [];

    $keys = array_keys($all);
    $placeholders = implode(',', array_fill(0, count($keys), '%s'));
    $existing = $wpdb->get_col( $wpdb->prepare("SELECT group_key FROM {$table} WHERE group_key IN ($placeholders)", $keys) );

    $has = $existing ? array_flip($existing) : [];
    $out = [];
    foreach($all as $gk=>$row){
        if (!isset($has[$gk])) $out[] = $row;
    }
    return $out;
}

function gstore_rule_list_page(){
    global $wpdb;
    $table = gstore_epp_table_rules();
    $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY updated_at DESC", ARRAY_A);
    $cands = gstore_fetch_models_without_rule();
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Pricing Rules</h1>
        <a class="page-title-action" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit') ); ?>">Add New</a>
        <a class="page-title-action" href="<?php echo esc_url( wp_nonce_url(admin_url('admin-post.php?action=gstore_clear_pricing_cache'), 'gstore_clear_pricing_cache') ); ?>" onclick="return confirm('Clear all pricing caches? This will force fresh data on next page load.');">Clear All Caches</a>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success is-dismissible"><p>Saved successfully.</p></div>'; ?>
        <?php if (!empty($_GET['cache_cleared'])) echo '<div class="notice notice-success is-dismissible"><p>All pricing caches cleared successfully.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error is-dismissible"><p>Error occurred. Check logs/error.log</p></div>'; ?>
        <hr class="wp-header-end" />

        <div class="notice notice-info">
            <p><strong>Important:</strong> Pricing rules are now storage-specific. Each storage size needs its own rule.</p>
            <p>Example: Create separate rules for "iPhone 14 Pro 128GB", "iPhone 14 Pro 256GB", etc.</p>
        </div>

        <h2>Existing Rules</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Group Key (Model + Storage)</th><th>Device</th><th>Default Tier</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($rows): foreach($rows as $r):
                // Parse group key to show it nicely
                $display_key = $r['group_key'];
                if (preg_match('/(\d+gb)$/', $display_key, $matches)) {
                    $display_key = str_replace($matches[1], ' - ' . strtoupper($matches[1]), $display_key);
                }
                ?>
                <tr>
                    <td><?php echo esc_html($display_key); ?></td>
                    <td><?php echo esc_html($r['device_type']); ?></td>
                    <td><?php echo esc_html($r['default_condition']); ?></td>
                    <td><?php echo esc_html($r['updated_at']); ?></td>
                    <td>
                        <a class="button button-small" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit&group_key='.urlencode($r['group_key'])) ); ?>">Edit</a>
                        <a class="button button-small button-link-delete" href="<?php echo esc_url( wp_nonce_url( admin_url('admin-post.php?action=gstore_delete_rule&group_key='.urlencode($r['group_key'])), 'gstore_delete_rule' ) ); ?>" onclick="return confirm('Delete this rule?');">Delete</a>
                    </td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="5">No rules yet.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>

        <h2 style="margin-top:24px;">Models + Storage Combinations Without Rules</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Model + Storage</th><th>Device</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($cands): foreach($cands as $c): ?>
                <tr>
                    <td><?php echo esc_html($c['display_key']); ?></td>
                    <td><?php echo esc_html($c['device_type']); ?></td>
                    <td><a class="button button-primary button-small" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit&group_key='.urlencode($c['group_key']).'&device_type='.urlencode($c['device_type']).'&storage='.urlencode($c['storage'])) ); ?>">Create Rule</a></td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="3">All model+storage combinations have rules or no products found.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}

function gstore_rule_edit_page(){
    global $wpdb;
    $table = gstore_epp_table_rules();

    $group_key  = isset($_GET['group_key']) ? sanitize_text_field($_GET['group_key']) : '';
    $device_type= isset($_GET['device_type']) ? sanitize_text_field($_GET['device_type']) : 'phone';
    $storage    = isset($_GET['storage']) ? sanitize_text_field($_GET['storage']) : '';

    $row = null;
    if ($group_key){
        $row = $wpdb->get_row( $wpdb->prepare("SELECT * FROM {$table} WHERE group_key=%s LIMIT 1", $group_key), ARRAY_A );
    }
    if ($row){
        $device_type = $row['device_type'];

        // Extract storage from group key if present
        if (preg_match('/(\d+gb)$/', $row['group_key'], $matches)) {
            $storage = strtoupper($matches[1]);
        }
    }

    $default_condition = $row ? ($row['default_condition'] ?: '') : '';
    $pricing = $row && $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];

    $tiers = ['80-85','85-90','90-95','95-100'];

    // Parse display name
    $display_key = $group_key;
    if (preg_match('/(.+?)(\d+gb)$/', $group_key, $matches)) {
        $base_model = trim($matches[1]);
        $storage_part = strtoupper($matches[2]);
        $display_key = $base_model . ' - ' . $storage_part;
    }
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline"><?php echo $row?'Edit Rule':'Add Rule'; ?></h1>
        <hr class="wp-header-end" />

        <?php if ($storage): ?>
            <div class="notice notice-info">
                <p><strong>Storage-Specific Rule:</strong> This rule applies only to <?php echo esc_html($storage); ?> variants.</p>
            </div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_rule','gstore_save_rule_nonce'); ?>
            <input type="hidden" name="action" value="gstore_save_rule" />

            <table class="form-table">
                <tr>
                    <th><label for="group_key">Group Key (Model + Storage)</label></th>
                    <td>
                        <input type="text" id="group_key" name="group_key" class="regular-text" required value="<?php echo esc_attr($group_key); ?>" <?php echo $row?'readonly':''; ?>>
                        <p class="description">
                            Format: "brand model storage" (lowercase, no special chars)<br>
                            Example: "apple iphone-14-pro 128gb" or "samsung galaxy-s23 256gb"<br>
                            <strong>Display:</strong> <?php echo esc_html($display_key); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th><label for="device_type">Device Type</label></th>
                    <td>
                        <select id="device_type" name="device_type">
                            <option value="phone" <?php selected($device_type,'phone'); ?>>Phone</option>
                            <option value="laptop" <?php selected($device_type,'laptop'); ?>>Laptop</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Default Used Tier</th>
                    <td>
                        <p class="description">Optional: Pre-select a tier for USED condition</p>
                        <?php foreach($tiers as $t): ?>
                            <label style="display:inline-block;margin-right:12px;">
                                <input type="radio" name="default_condition" value="<?php echo esc_attr($t); ?>" <?php checked($default_condition,$t); ?> />
                                <?php echo esc_html($t); ?>%
                            </label>
                        <?php endforeach; ?>
                        <label style="display:inline-block;margin-left:12px;">
                            <input type="radio" name="default_condition" value="" <?php checked($default_condition,''); ?> /> None
                        </label>
                    </td>
                </tr>
            </table>

            <h2>Pricing (GEL) for <?php echo $storage ? esc_html($storage) : 'this model'; ?></h2>
            <p class="description">Leave empty to disable that tier. Empty tiers will be greyed out on product page.</p>
            <table class="widefat striped" style="max-width:720px;">
                <thead><tr><th>Tier</th><th>Regular Price</th><th>Sale Price</th></tr></thead>
                <tbody>
                <?php foreach($tiers as $t):
                    $reg = isset($pricing[$t]['regular']) ? $pricing[$t]['regular'] : '';
                    $sal = isset($pricing[$t]['sale']) ? $pricing[$t]['sale'] : '';
                    ?>
                    <tr>
                        <td><strong><?php echo esc_html($t); ?>%</strong></td>
                        <td><input type="number" step="0.01" name="pricing[<?php echo esc_attr($t); ?>][regular]" value="<?php echo esc_attr($reg); ?>" placeholder="0.00"></td>
                        <td><input type="number" step="0.01" name="pricing[<?php echo esc_attr($t); ?>][sale]" value="<?php echo esc_attr($sal); ?>" placeholder="0.00"></td>
                    </tr>
                <?php endforeach; ?>
                <tr>
                    <td><strong>+ New Battery</strong><br><small>(Phones only)</small></td>
                    <?php
                    $nb_reg = isset($pricing['new_battery']['regular']) ? $pricing['new_battery']['regular'] : '';
                    $nb_sal = isset($pricing['new_battery']['sale']) ? $pricing['new_battery']['sale'] : '';
                    ?>
                    <td><input type="number" step="0.01" name="pricing[new_battery][regular]" value="<?php echo esc_attr($nb_reg); ?>" placeholder="0.00"></td>
                    <td><input type="number" step="0.01" name="pricing[new_battery][sale]" value="<?php echo esc_attr($nb_sal); ?>" placeholder="0.00"></td>
                </tr>
                </tbody>
            </table>

            <h2 style="margin-top:24px;">Warranty Information</h2>
            <p class="description">Set warranty text for this specific model+storage combination.</p>
            <table class="form-table">
                <tr>
                    <th><label for="warranty_text">Warranty Text</label></th>
                    <td>
                        <textarea id="warranty_text" name="warranty_text" rows="4" class="large-text"><?php echo esc_textarea($row['warranty_text'] ?? ''); ?></textarea>
                        <p class="description">This text will appear in the Warranty tab on product pages for this model+storage.</p>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <button type="submit" class="button button-primary button-large">Save Rule</button>
                <a class="button button-large" href="<?php echo esc_url(admin_url('admin.php?page=gstore_rules')); ?>">Cancel</a>
            </p>
        </form>
    </div>
    <?php
}

// Handlers
function gstore_handle_save_rule(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    if (!isset($_POST['gstore_save_rule_nonce']) || !wp_verify_nonce($_POST['gstore_save_rule_nonce'], 'gstore_save_rule')) {
        wp_die('Nonce verification failed', 'Error', ['response'=>403]);
    }

    try{
        global $wpdb;
        $table = gstore_epp_table_rules();

        $group_key = sanitize_text_field($_POST['group_key'] ?? '');
        $device_type = sanitize_text_field($_POST['device_type'] ?? 'phone');
        $default_condition = isset($_POST['default_condition']) ? sanitize_text_field($_POST['default_condition']) : '';
        $warranty_text = isset($_POST['warranty_text']) ? wp_kses_post($_POST['warranty_text']) : '';

        if (!$group_key) {
            throw new Exception('Group key is required');
        }

        $pricing = isset($_POST['pricing']) && is_array($_POST['pricing']) ? $_POST['pricing'] : [];
        $clean = [];
        foreach($pricing as $k=>$row){
            $reg = isset($row['regular']) ? preg_replace('~[^0-9\.\-]~','',$row['regular']) : '';
            $sal = isset($row['sale']) ? preg_replace('~[^0-9\.\-]~','',$row['sale']) : '';
            $clean[$k] = ['regular'=>$reg,'sale'=>$sal];
        }
        $json = wp_json_encode($clean);

        $exists = $wpdb->get_var( $wpdb->prepare("SELECT id FROM {$table} WHERE group_key=%s LIMIT 1", $group_key) );

        if ($exists){
            $wpdb->update($table, [
                    'device_type'=>$device_type,
                    'default_condition'=>$default_condition,
                    'pricing_json'=>$json,
                    'warranty_text'=>$warranty_text,
                    'updated_at'=>current_time('mysql')
            ], ['id'=>$exists], ['%s','%s','%s','%s','%s'], ['%d']);
        } else {
            $wpdb->insert($table, [
                    'group_key'=>$group_key,
                    'device_type'=>$device_type,
                    'default_condition'=>$default_condition,
                    'pricing_json'=>$json,
                    'warranty_text'=>$warranty_text,
            ], ['%s','%s','%s','%s','%s']);
        }

        // Clear ALL product caches to ensure prices update immediately
        global $wpdb;
        $sql = "SELECT DISTINCT p.ID FROM {$wpdb->posts} p
                WHERE p.post_type = 'product'
                AND p.post_status = 'publish'
                LIMIT 1000";

        $all_pids = $wpdb->get_col($sql);
        foreach($all_pids as $pid) {
            delete_transient('gstore_pricing_' . $pid);
            delete_transient('gstore_warranty_' . $pid);
            delete_transient('gstore_siblings_' . $pid);
        }

        gstore_log_debug('rule_saved', compact('group_key','device_type'));

        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('rule_save_failed', ['err'=>$e->getMessage(),'trace'=>$e->getTraceAsString()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&err=1') );
        exit;
    }
}

function gstore_handle_delete_rule(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    check_admin_referer('gstore_delete_rule');

    try{
        global $wpdb;
        $table = gstore_epp_table_rules();
        $group_key = isset($_GET['group_key']) ? sanitize_text_field($_GET['group_key']) : '';

        if ($group_key){
            $wpdb->delete($table, ['group_key'=>$group_key], ['%s']);
            gstore_log_debug('rule_deleted', ['group_key'=>$group_key]);

            // Clear related caches for all products
            global $wpdb;
            $sql = "SELECT DISTINCT p.ID FROM {$wpdb->posts} p
                    WHERE p.post_type = 'product'
                    AND p.post_status = 'publish'
                    LIMIT 500";

            $all_pids = $wpdb->get_col($sql);
            foreach($all_pids as $pid) {
                delete_transient('gstore_pricing_' . $pid);
                delete_transient('gstore_warranty_' . $pid);
                delete_transient('gstore_siblings_' . $pid);
            }
        }

        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('rule_delete_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&err=1') );
        exit;
    }
}

function gstore_handle_clear_pricing_cache(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    check_admin_referer('gstore_clear_pricing_cache');

    try{
        global $wpdb;

        // Clear all pricing, warranty, and siblings caches
        $sql = "SELECT DISTINCT p.ID FROM {$wpdb->posts} p
                WHERE p.post_type = 'product'
                AND p.post_status = 'publish'
                LIMIT 1000";

        $all_pids = $wpdb->get_col($sql);
        $cleared = 0;

        foreach($all_pids as $pid) {
            delete_transient('gstore_pricing_' . $pid);
            delete_transient('gstore_warranty_' . $pid);
            delete_transient('gstore_siblings_' . $pid);
            delete_transient('gstore_fbt_' . $pid);
            delete_transient('gstore_compare_specs_' . $pid);
            $cleared++;
        }

        gstore_log_debug('pricing_cache_cleared', ['count'=>$cleared]);

        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&cache_cleared=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('cache_clear_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&err=1') );
        exit;
    }
}

function gstore_handle_clear_rules(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    check_admin_referer('gstore_clear_rules');

    try{
        global $wpdb;
        $table = gstore_epp_table_rules();
        $cnt = $wpdb->query("TRUNCATE TABLE {$table}");
        gstore_log_debug('rules_cleared', ['count'=>$cnt]);

        // Clear all pricing caches
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_pricing_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_warranty_%'");

        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('rules_clear_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&err=1') );
        exit;
    }
}

// --- Add-ons (laptops)
function gstore_addons_page(){
    $data = get_option('gstore_epp_addons_laptop', ['rows'=>[]]);
    $rows = isset($data['rows']) && is_array($data['rows']) ? $data['rows'] : [];
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Global Add-ons (Laptops)</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success is-dismissible"><p>Saved successfully.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error is-dismissible"><p>Error occurred. Check logs.</p></div>'; ?>
        <hr class="wp-header-end" />

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_addons','gstore_save_addons_nonce'); ?>
            <input type="hidden" name="action" value="gstore_save_addons">

            <table class="widefat striped" style="max-width:860px;">
                <thead><tr><th>Key</th><th>Label (shown on UI)</th><th>Price (GEL)</th><th>Remove</th></tr></thead>
                <tbody id="addons-tbody">
                <?php
                if ($rows) {
                    foreach($rows as $i=>$r){
                        $k = esc_attr($r['key'] ?? '');
                        $l = esc_attr($r['label'] ?? '');
                        $p = esc_attr($r['price'] ?? '');
                        echo '<tr>';
                        echo '<td><input name="rows['.$i.'][key]" value="'.$k.'" class="regular-text" /></td>';
                        echo '<td><input name="rows['.$i.'][label]" value="'.$l.'" class="regular-text" /></td>';
                        echo '<td><input type="number" step="0.01" name="rows['.$i.'][price]" value="'.$p.'" style="width:100px;" /></td>';
                        echo '<td><button type="button" class="button button-small remove-row">Remove</button></td>';
                        echo '</tr>';
                    }
                } else {
                    echo '<tr><td colspan="4"><em>No add-ons yet. Add one below.</em></td></tr>';
                }
                ?>
                </tbody>
            </table>

            <p>
                <button type="button" class="button" id="add-row">+ Add Row</button>
            </p>

            <p class="submit">
                <button type="submit" class="button button-primary">Save Add-ons</button>
                <a class="button" href="<?php echo esc_url( wp_nonce_url(admin_url('admin-post.php?action=gstore_save_addons&reset=1'), 'gstore_save_addons','gstore_save_addons_nonce') ); ?>" onclick="return confirm('Reset to empty list?');">Reset</a>
            </p>
        </form>

        <script>
            jQuery(function($){
                var rowIndex = <?php echo count($rows); ?>;
                $('#add-row').on('click', function(){
                    $('#addons-tbody').append(
                        '<tr>' +
                        '<td><input name="rows['+rowIndex+'][key]" class="regular-text" placeholder="ram-16" /></td>' +
                        '<td><input name="rows['+rowIndex+'][label]" class="regular-text" placeholder="Add RAM 16GB" /></td>' +
                        '<td><input type="number" step="0.01" name="rows['+rowIndex+'][price]" style="width:100px;" placeholder="199.00" /></td>' +
                        '<td><button type="button" class="button button-small remove-row">Remove</button></td>' +
                        '</tr>'
                    );
                    rowIndex++;
                });

                $(document).on('click', '.remove-row', function(){
                    if (confirm('Remove this row?')) {
                        $(this).closest('tr').remove();
                    }
                });
            });
        </script>
    </div>
    <?php
}

function gstore_handle_save_addons(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    if (!isset($_GET['reset'])) {
        if (!isset($_POST['gstore_save_addons_nonce']) || !wp_verify_nonce($_POST['gstore_save_addons_nonce'], 'gstore_save_addons')) {
            wp_die('Nonce verification failed', 'Error', ['response'=>403]);
        }
    } else {
        check_admin_referer('gstore_save_addons', 'gstore_save_addons_nonce');
    }

    try{
        if (isset($_GET['reset'])){
            delete_option('gstore_epp_addons_laptop');
        } else {
            $rows = $_POST['rows'] ?? [];
            $out = [];
            foreach($rows as $r){
                $k = isset($r['key']) ? sanitize_key($r['key']) : '';
                $l = isset($r['label']) ? sanitize_text_field($r['label']) : '';
                $p = isset($r['price']) ? preg_replace('~[^0-9\.\-]~','',$r['price']) : '';
                if ($k && $l && $p!==''){
                    $out[] = ['key'=>$k,'label'=>$l,'price'=>$p];
                }
            }
            update_option('gstore_epp_addons_laptop', ['rows'=>$out], false);
        }

        wp_safe_redirect( admin_url('admin.php?page=gstore_addons&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('addons_save_failed',['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_addons&err=1') );
        exit;
    }
}

// --- Debug page
function gstore_debug_page(){
    $full = gstore_epp_opt('debug_full', 0);
    $err  = gstore_epp_opt('debug_errors', 1);
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Debug & Logging</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success is-dismissible"><p>Saved successfully.</p></div>'; ?>
        <hr class="wp-header-end" />

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_debug','gstore_save_debug_nonce'); ?>
            <input type="hidden" name="action" value="gstore_save_debug">

            <table class="form-table">
                <tr>
                    <th>Full Debug Logging</th>
                    <td>
                        <label>
                            <input type="checkbox" name="debug_full" value="1" <?php checked($full,1); ?>>
                            Write all operations to <code>logs/fdebug.log</code>
                        </label>
                        <p class="description">Enable for troubleshooting siblings, pricing, FBT, etc.</p>
                    </td>
                </tr>
                <tr>
                    <th>Error Logging Only</th>
                    <td>
                        <label>
                            <input type="checkbox" name="debug_errors" value="1" <?php checked($err,1); ?>>
                            Write errors to <code>logs/error.log</code>
                        </label>
                        <p class="description">Recommended to keep enabled.</p>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <button type="submit" class="button button-primary">Save Settings</button>
            </p>
        </form>
    </div>
    <?php
}

function gstore_handle_save_debug(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    if (!isset($_POST['gstore_save_debug_nonce']) || !wp_verify_nonce($_POST['gstore_save_debug_nonce'], 'gstore_save_debug')) {
        wp_die('Nonce verification failed', 'Error', ['response'=>403]);
    }

    try{
        gstore_epp_update_opt([
                'debug_full'   => isset($_POST['debug_full'])?1:0,
                'debug_errors' => isset($_POST['debug_errors'])?1:0,
        ]);

        wp_safe_redirect( admin_url('admin.php?page=gstore_debug&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('debug_save_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_debug&err=1') );
        exit;
    }
}

// --- Maintenance
function gstore_maint_page(){
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Maintenance</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success is-dismissible"><p>Operation completed.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error is-dismissible"><p>Error occurred. Check logs.</p></div>'; ?>
        <hr class="wp-header-end" />

        <h2>Danger Zone</h2>
        <p class="description">Use with caution. These actions cannot be undone.</p>

        <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>" style="margin-top:20px;">
            <?php wp_nonce_field('gstore_clear_rules'); ?>
            <input type="hidden" name="action" value="gstore_clear_rules">
            <button type="submit" class="button button-secondary" onclick="return confirm('Are you sure? This deletes ALL pricing rules and cannot be undone.');">Clear ALL Pricing Rules</button>
        </form>

        <h2 style="margin-top:24px;">Clear Caches</h2>
        <p class="description">Clear all cached data to force fresh queries.</p>
        <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>" style="margin-top:12px;">
            <?php wp_nonce_field('gstore_clear_caches'); ?>
            <input type="hidden" name="action" value="gstore_clear_caches">
            <button type="submit" class="button" onclick="return confirm('Clear all plugin caches?');">Clear All Caches</button>
        </form>
    </div>
    <?php
}

// Cache clearing handler
add_action('admin_post_gstore_clear_caches', function(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    check_admin_referer('gstore_clear_caches');

    try {
        global $wpdb;

        // Clear all Gstore transients
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_gstore_%'");

        gstore_log_debug('caches_cleared', ['timestamp'=>current_time('mysql')]);

        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('cache_clear_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&err=1') );
        exit;
    }
});

// --- Challenge Game Settings
function gstore_challenge_page(){
    $settings = get_option('gstore_epp_challenge_settings', gstore_challenge_default_settings());

    if (!empty($_GET['updated'])) {
        echo '<div class="notice notice-success is-dismissible"><p>Settings saved successfully.</p></div>';
    }
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Challenge Game Settings</h1>
        <hr class="wp-header-end" />

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_challenge','gstore_save_challenge_nonce'); ?>
            <input type="hidden" name="action" value="gstore_save_challenge" />

            <h2>Game Difficulty</h2>
            <table class="form-table">
                <tr>
                    <th><label for="flappy_score">Flappy Bird Score to Advance</label></th>
                    <td>
                        <input type="number" id="flappy_score" name="flappy_score" value="<?php echo esc_attr($settings['flappy_score']); ?>" min="1" max="100" />
                        <p class="description">Score required to pass level 1 (default: 5)</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="chess_difficulty">Chess AI Difficulty (Stockfish Depth)</label></th>
                    <td>
                        <select id="chess_difficulty" name="chess_difficulty">
                            <option value="1" <?php selected($settings['chess_difficulty'], '1'); ?>>Very Easy (Depth 1)</option>
                            <option value="2" <?php selected($settings['chess_difficulty'], '2'); ?>>Easy (Depth 2)</option>
                            <option value="3" <?php selected($settings['chess_difficulty'], '3'); ?>>Medium (Depth 3)</option>
                            <option value="4" <?php selected($settings['chess_difficulty'], '4'); ?>>Hard (Depth 4)</option>
                            <option value="5" <?php selected($settings['chess_difficulty'], '5'); ?>>Very Hard (Depth 5)</option>
                        </select>
                        <p class="description">Stockfish search depth - higher is harder (default: 2 - Easy)</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="math_tries">Math Challenge Attempts</label></th>
                    <td>
                        <input type="number" id="math_tries" name="math_tries" value="<?php echo esc_attr($settings['math_tries']); ?>" min="1" max="10" />
                        <p class="description">Number of attempts for math challenge (default: 5)</p>
                    </td>
                </tr>
            </table>

            <h2>Translations (Georgian)</h2>
            <table class="form-table">
                <tr>
                    <th><label for="unlock_btn">Unlock Button Text</label></th>
                    <td><input type="text" id="unlock_btn" name="unlock_btn" value="<?php echo esc_attr($settings['unlock_btn']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="unlocked_btn">Unlocked Button Text</label></th>
                    <td><input type="text" id="unlocked_btn" name="unlocked_btn" value="<?php echo esc_attr($settings['unlocked_btn']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="intro_title">Intro Title</label></th>
                    <td><input type="text" id="intro_title" name="intro_title" value="<?php echo esc_attr($settings['intro_title']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="intro_desc2">Intro Description 2</label></th>
                    <td><input type="text" id="intro_desc2" name="intro_desc2" value="<?php echo esc_attr($settings['intro_desc2']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="intro_desc3">Intro Description 3</label></th>
                    <td><input type="text" id="intro_desc3" name="intro_desc3" value="<?php echo esc_attr($settings['intro_desc3']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="start_btn">Start Button</label></th>
                    <td><input type="text" id="start_btn" name="start_btn" value="<?php echo esc_attr($settings['start_btn']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="lose_title">Lose Title</label></th>
                    <td><input type="text" id="lose_title" name="lose_title" value="<?php echo esc_attr($settings['lose_title']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="lose_desc">Lose Description</label></th>
                    <td><input type="text" id="lose_desc" name="lose_desc" value="<?php echo esc_attr($settings['lose_desc']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="try_again">Try Again Button</label></th>
                    <td><input type="text" id="try_again" name="try_again" value="<?php echo esc_attr($settings['try_again']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="level2_title">Level 2 Title</label></th>
                    <td><input type="text" id="level2_title" name="level2_title" value="<?php echo esc_attr($settings['level2_title']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="level2_desc1">Level 2 Description 1</label></th>
                    <td><input type="text" id="level2_desc1" name="level2_desc1" value="<?php echo esc_attr($settings['level2_desc1']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="level2_desc2">Level 2 Description 2</label></th>
                    <td><input type="text" id="level2_desc2" name="level2_desc2" value="<?php echo esc_attr($settings['level2_desc2']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="continue_btn">Continue Button</label></th>
                    <td><input type="text" id="continue_btn" name="continue_btn" value="<?php echo esc_attr($settings['continue_btn']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="chess_title">Chess Title</label></th>
                    <td><input type="text" id="chess_title" name="chess_title" value="<?php echo esc_attr($settings['chess_title']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="math_title">Math Title</label></th>
                    <td><input type="text" id="math_title" name="math_title" value="<?php echo esc_attr($settings['math_title']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="math_question">Math Question</label></th>
                    <td>
                        <input type="text" id="math_question" name="math_question" value="<?php echo esc_attr($settings['math_question']); ?>" class="regular-text" />
                        <p class="description">The math question displayed to users (e.g., "რა არის 6 × 7 ?")</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="math_answer">Math Answer (Correct Answer)</label></th>
                    <td>
                        <input type="number" id="math_answer" name="math_answer" value="<?php echo esc_attr($settings['math_answer'] ?? '42'); ?>" class="regular-text" step="0.01" />
                        <p class="description">The correct numerical answer to the math question (e.g., 42 for "6 × 7")</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="submit_btn">Submit Button</label></th>
                    <td><input type="text" id="submit_btn" name="submit_btn" value="<?php echo esc_attr($settings['submit_btn']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="congratulations">Congratulations</label></th>
                    <td><input type="text" id="congratulations" name="congratulations" value="<?php echo esc_attr($settings['congratulations']); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="score">Score Label</label></th>
                    <td><input type="text" id="score" name="score" value="<?php echo esc_attr($settings['score'] ?? 'ქულა'); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="close_btn">Close Button</label></th>
                    <td><input type="text" id="close_btn" name="close_btn" value="<?php echo esc_attr($settings['close_btn'] ?? 'დახურვა'); ?>" class="regular-text" /></td>
                </tr>
            </table>

            <p class="submit">
                <button type="submit" class="button button-primary button-large">Save Settings</button>
                <a class="button button-large" href="<?php echo esc_url( wp_nonce_url(admin_url('admin-post.php?action=gstore_reset_challenge'), 'gstore_reset_challenge') ); ?>" onclick="return confirm('Reset to default values?');">Reset to Defaults</a>
            </p>
        </form>
    </div>
    <?php
}

function gstore_challenge_default_settings(){
    return [
            'flappy_score' => 5,
            'chess_difficulty' => '2',
            'math_tries' => 5,
            'unlock_btn' => 'დაიმსახურე ყველაზე დაბალი ფასი!',
            'unlocked_btn' => '✅ განსაკუთრებული ფასი გახსნილია!',
            'intro_title' => 'დაიმსახურე ყველაზე დაბალი ფასი!',
            'intro_desc2' => 'ამას დამსახურება სჭირდება!',
            'intro_desc3' => 'დაგვამარცხე სამ დონიან თამაშში და მიიღე განსაკუთრებული ფასი.',
            'start_btn' => 'დაწყება',
            'lose_title' => 'შენ დამარცხდი',
            'lose_desc' => 'არ დანებდე, დაგვამარცხე და დაიმსახურე!',
            'try_again' => 'კიდევ სცადე',
            'level2_title' => 'შენ გადახვედი მეორე დონეზე!',
            'level2_desc1' => 'ყოჩაღ, შენ შეძელი და გაიარე პირველი დაბრკოლება.',
            'level2_desc2' => 'შემდეგი მისია: ჭადრაკი',
            'continue_btn' => 'გაგრძელება',
            'chess_title' => 'მეორე დონე: დაამარცხე ჭადრაკში Gstore Chess AI',
            'math_title' => 'დონე მესამე: მათემატიკური პრობლემა',
            'math_question' => 'რა არის 6 × 7 ?',
            'math_answer' => '42',
            'submit_btn' => 'სცადე',
            'congratulations' => 'გილოცავ',
            'score' => 'ქულა',
            'close_btn' => 'დახურვა'
    ];
}

function gstore_handle_save_challenge(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    if (!isset($_POST['gstore_save_challenge_nonce']) || !wp_verify_nonce($_POST['gstore_save_challenge_nonce'], 'gstore_save_challenge')) {
        wp_die('Nonce verification failed', 'Error', ['response'=>403]);
    }

    try{
        $settings = [
                'flappy_score' => max(1, min(100, absint($_POST['flappy_score'] ?? 5))),
                'chess_difficulty' => sanitize_text_field($_POST['chess_difficulty'] ?? '2'),
                'math_tries' => max(1, min(10, absint($_POST['math_tries'] ?? 5))),
                'unlock_btn' => sanitize_text_field($_POST['unlock_btn'] ?? ''),
                'unlocked_btn' => sanitize_text_field($_POST['unlocked_btn'] ?? ''),
                'intro_title' => sanitize_text_field($_POST['intro_title'] ?? ''),
                'intro_desc2' => sanitize_text_field($_POST['intro_desc2'] ?? ''),
                'intro_desc3' => sanitize_text_field($_POST['intro_desc3'] ?? ''),
                'start_btn' => sanitize_text_field($_POST['start_btn'] ?? ''),
                'lose_title' => sanitize_text_field($_POST['lose_title'] ?? ''),
                'lose_desc' => sanitize_text_field($_POST['lose_desc'] ?? ''),
                'try_again' => sanitize_text_field($_POST['try_again'] ?? ''),
                'level2_title' => sanitize_text_field($_POST['level2_title'] ?? ''),
                'level2_desc1' => sanitize_text_field($_POST['level2_desc1'] ?? ''),
                'level2_desc2' => sanitize_text_field($_POST['level2_desc2'] ?? ''),
                'continue_btn' => sanitize_text_field($_POST['continue_btn'] ?? ''),
                'chess_title' => sanitize_text_field($_POST['chess_title'] ?? ''),
                'math_title' => sanitize_text_field($_POST['math_title'] ?? ''),
                'math_question' => sanitize_text_field($_POST['math_question'] ?? ''),
                'math_answer' => sanitize_text_field($_POST['math_answer'] ?? '42'),
                'submit_btn' => sanitize_text_field($_POST['submit_btn'] ?? ''),
                'congratulations' => sanitize_text_field($_POST['congratulations'] ?? ''),
                'score' => sanitize_text_field($_POST['score'] ?? ''),
                'close_btn' => sanitize_text_field($_POST['close_btn'] ?? '')
        ];

        update_option('gstore_epp_challenge_settings', $settings, false);

        wp_safe_redirect( admin_url('admin.php?page=gstore_challenge&updated=1') );
        exit;

    } catch(\Throwable $e){
        wp_safe_redirect( admin_url('admin.php?page=gstore_challenge&err=1') );
        exit;
    }
}

function gstore_handle_reset_challenge(){
    if (!current_user_can('manage_woocommerce')) {
        wp_die('Unauthorized', 'Error', ['response'=>403]);
    }

    check_admin_referer('gstore_reset_challenge');

    delete_option('gstore_epp_challenge_settings');

    wp_safe_redirect( admin_url('admin.php?page=gstore_challenge&updated=1') );
    exit;
}
