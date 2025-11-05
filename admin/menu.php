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
    add_submenu_page('gstore_root','Debug & Logging','Debug & Logging','manage_woocommerce','gstore_debug','gstore_debug_page');
    add_submenu_page('gstore_root','Maintenance','Maintenance','manage_woocommerce','gstore_maint','gstore_maint_page');
});

// Register admin post actions
add_action('admin_post_gstore_save_rule','gstore_handle_save_rule');
add_action('admin_post_gstore_delete_rule','gstore_handle_delete_rule');
add_action('admin_post_gstore_clear_rules','gstore_handle_clear_rules');
add_action('admin_post_gstore_save_addons','gstore_handle_save_addons');
add_action('admin_post_gstore_save_debug','gstore_handle_save_debug');

// --- Pricing Rules UI
function gstore_rules_page(){
    $action = isset($_GET['action']) ? sanitize_text_field($_GET['action']) : 'list';
    if ($action === 'edit') { gstore_rule_edit_page(); } else { gstore_rule_list_page(); }
}

function gstore_fetch_models_without_rule(){
    global $wpdb;
    $table = gstore_epp_table_rules();

    $q = new WP_Query([
            'post_type'=>'product',
            'posts_per_page'=>-1,
            'post_status'=>'publish',
            'fields'=>'ids'
    ]);

    $all = [];
    if ($q->have_posts()){
        foreach ($q->posts as $pid){
            $ctx = gstore_epp_parse_by_product_id($pid);
            if (!$ctx || !$ctx['group_key']) continue;
            $all[$ctx['group_key']] = [
                    'group_key'=>$ctx['group_key'],
                    'device_type'=>$ctx['device_type']
            ];
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
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success is-dismissible"><p>Saved successfully.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error is-dismissible"><p>Error occurred. Check logs/error.log</p></div>'; ?>
        <hr class="wp-header-end" />

        <h2>Existing Rules</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Group Key</th><th>Device</th><th>Default Tier</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($rows): foreach($rows as $r): ?>
                <tr>
                    <td><?php echo esc_html($r['group_key']); ?></td>
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

        <h2 style="margin-top:24px;">Models Without Rule</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Group Key</th><th>Device</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($cands): foreach($cands as $c): ?>
                <tr>
                    <td><?php echo esc_html($c['group_key']); ?></td>
                    <td><?php echo esc_html($c['device_type']); ?></td>
                    <td><a class="button button-primary button-small" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit&group_key='.urlencode($c['group_key']).'&device_type='.urlencode($c['device_type'])) ); ?>">Create Rule</a></td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="3">All models have rules or no products found.</td></tr>
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

    $row = null;
    if ($group_key){
        $row = $wpdb->get_row( $wpdb->prepare("SELECT * FROM {$table} WHERE group_key=%s LIMIT 1", $group_key), ARRAY_A );
    }
    if ($row){
        $device_type = $row['device_type'];
    }

    $default_condition = $row ? ($row['default_condition'] ?: '') : '';
    $pricing = $row && $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];

    $tiers = ['80-85','85-90','90-95','95-100'];
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline"><?php echo $row?'Edit Rule':'Add Rule'; ?></h1>
        <hr class="wp-header-end" />

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_rule','gstore_save_rule_nonce'); ?>
            <input type="hidden" name="action" value="gstore_save_rule" />

            <table class="form-table">
                <tr>
                    <th><label for="group_key">Group Key</label></th>
                    <td><input type="text" id="group_key" name="group_key" class="regular-text" required value="<?php echo esc_attr($group_key); ?>" <?php echo $row?'readonly':''; ?>></td>
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

            <h2>Pricing (GEL)</h2>
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
            <p class="description">Set warranty text for this model. All products in this model will share this warranty information.</p>
            <table class="form-table">
                <tr>
                    <th><label for="warranty_text">Warranty Text</label></th>
                    <td>
                        <textarea id="warranty_text" name="warranty_text" rows="4" class="large-text"><?php echo esc_textarea($row['warranty_text'] ?? ''); ?></textarea>
                        <p class="description">This text will appear in the Warranty tab on product pages for this model.</p>
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
        }

        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&updated=1') );
        exit;

    } catch(\Throwable $e){
        gstore_log_error('rule_delete_failed', ['err'=>$e->getMessage()]);
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
    </div>
    <?php
}
