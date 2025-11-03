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

    add_action('admin_post_gstore_save_rule','gstore_handle_save_rule');
    add_action('admin_post_gstore_delete_rule','gstore_handle_delete_rule');
    add_action('admin_post_gstore_clear_rules','gstore_handle_clear_rules');
    add_action('admin_post_gstore_save_addons','gstore_handle_save_addons');
    add_action('admin_post_gstore_save_debug','gstore_handle_save_debug');
});

// --- Pricing Rules UI
function gstore_rules_page(){
    $action = isset($_GET['action']) ? sanitize_text_field($_GET['action']) : 'list';
    if ($action === 'edit') { gstore_rule_edit_page(); } else { gstore_rule_list_page(); }
}

function gstore_fetch_models_without_rule(){
    global $wpdb; $table = gstore_epp_table_rules();
    $q = new WP_Query(['post_type'=>'product','posts_per_page'=>-1,'post_status'=>'publish','fields'=>'ids']);
    $all = [];
    if ($q->have_posts()){
        foreach ($q->posts as $pid){
            $ctx = gstore_epp_parse_by_product_id($pid); if (!$ctx) continue;
            if (!$ctx['group_key']) continue;
            $all[$ctx['group_key']] = ['group_key'=>$ctx['group_key'], 'device_type'=>$ctx['device_type']];
        }
    }
    wp_reset_postdata();
    if (!$all) return [];

    $keys = array_keys($all);
    $ph = implode(',', array_fill(0, count($keys), '%s'));
    $existing = $wpdb->get_col( $wpdb->prepare("SELECT group_key FROM {$table} WHERE group_key IN ($ph)", $keys) );
    $has = $existing ? array_flip($existing) : [];
    $out = [];
    foreach($all as $gk=>$row){ if (!isset($has[$gk])) $out[] = $row; }
    return $out;
}

function gstore_rule_list_page(){
    global $wpdb; $table = gstore_epp_table_rules();
    $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY updated_at DESC", ARRAY_A);
    $cands = gstore_fetch_models_without_rule();
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Pricing Rules</h1>
        <a class="page-title-action" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit') ); ?>">Add New</a>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success"><p>Saved.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error"><p>Error occurred. See logs/error.log</p></div>'; ?>
        <hr class="wp-header-end" />

        <h2>Existing</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Group Key</th><th>Device</th><th>Default Tier</th><th>Updated</th><th></th></tr></thead>
            <tbody>
            <?php if ($rows): foreach($rows as $r): ?>
                <tr>
                    <td><?php echo esc_html($r['group_key']); ?></td>
                    <td><?php echo esc_html($r['device_type']); ?></td>
                    <td><?php echo esc_html($r['default_condition']); ?></td>
                    <td><?php echo esc_html($r['updated_at']); ?></td>
                    <td>
                        <a class="button" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit&group_key='.urlencode($r['group_key'])) ); ?>">Edit</a>
                        <a class="button button-link-delete" href="<?php echo wp_nonce_url( admin_url('admin-post.php?action=gstore_delete_rule&group_key='.urlencode($r['group_key'])), 'gstore_delete_rule' ); ?>">Delete</a>
                    </td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="5">No rules yet.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>

        <h2 style="margin-top:24px;">Models Without Rule</h2>
        <table class="widefat fixed striped">
            <thead><tr><th>Group Key</th><th>Device</th><th></th></tr></thead>
            <tbody>
            <?php if ($cands): foreach($cands as $c): ?>
                <tr>
                    <td><?php echo esc_html($c['group_key']); ?></td>
                    <td><?php echo esc_html($c['device_type']); ?></td>
                    <td><a class="button button-primary" href="<?php echo esc_url( admin_url('admin.php?page=gstore_rules&action=edit&group_key='.urlencode($c['group_key']).'&device_type='.urlencode($c['device_type'])) ); ?>">Create Rule</a></td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="3">All covered or discovery did not find any models.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}

function gstore_rule_edit_page(){
    global $wpdb; $table = gstore_epp_table_rules();

    $group_key  = isset($_GET['group_key']) ? sanitize_text_field($_GET['group_key']) : '';
    $device_type= isset($_GET['device_type']) ? sanitize_text_field($_GET['device_type']) : 'phone';
    $row = null; if ($group_key){ $row = $wpdb->get_row( $wpdb->prepare("SELECT * FROM {$table} WHERE group_key=%s LIMIT 1", $group_key), ARRAY_A ); }
    if ($row){ $device_type = $row['device_type']; }

    $default_condition = $row ? ($row['default_condition'] ?: '') : '';
    $pricing = $row && $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];

    $tiers = ['80-85','85-90','90-95','95-100'];
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline"><?php echo $row?'Edit Rule':'Add Rule'; ?></h1>
        <hr class="wp-header-end" />
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_rule'); ?>
            <input type="hidden" name="action" value="gstore_save_rule" />

            <table class="form-table">
                <tr>
                    <th>Group Key</th>
                    <td><input type="text" name="group_key" class="regular-text" required value="<?php echo esc_attr($group_key); ?>"></td>
                </tr>
                <tr>
                    <th>Device Type</th>
                    <td>
                        <select name="device_type">
                            <option value="phone" <?php selected($device_type,'phone'); ?>>Phone</option>
                            <option value="laptop" <?php selected($device_type,'laptop'); ?>>Laptop</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Default Used Tier</th>
                    <td>
                        <em>(Optional; if empty, UI does not highlight a default)</em><br>
                        <?php foreach($tiers as $t): ?>
                            <label style="margin-right:12px;">
                                <input type="radio" name="default_condition" value="<?php echo esc_attr($t); ?>" <?php checked($default_condition,$t); ?> />
                                <?php echo esc_html($t); ?>
                            </label>
                        <?php endforeach; ?>
                        <label style="margin-left:12px;">
                            <input type="radio" name="default_condition" value="" <?php checked($default_condition,''); ?> /> None
                        </label>
                    </td>
                </tr>
            </table>

            <h2>Pricing (GEL)</h2>
            <p>Tiers with empty price will be greyed out on the product page.</p>
            <table class="widefat striped" style="max-width:720px;">
                <thead><tr><th>Tier</th><th>Regular</th><th>Sale</th></tr></thead>
                <tbody>
                <?php foreach($tiers as $t):
                    $reg = isset($pricing[$t]['regular']) ? $pricing[$t]['regular'] : '';
                    $sal = isset($pricing[$t]['sale']) ? $pricing[$t]['sale'] : '';
                    ?>
                    <tr>
                        <td><strong><?php echo esc_html($t); ?>%</strong></td>
                        <td><input type="text" name="pricing[<?php echo esc_attr($t); ?>][regular]" value="<?php echo esc_attr($reg); ?>"></td>
                        <td><input type="text" name="pricing[<?php echo esc_attr($t); ?>][sale]" value="<?php echo esc_attr($sal); ?>"></td>
                    </tr>
                <?php endforeach; ?>
                <tr>
                    <td><strong>+ New Battery (phones)</strong></td>
                    <?php
                    $nb_reg = isset($pricing['new_battery']['regular']) ? $pricing['new_battery']['regular'] : '';
                    $nb_sal = isset($pricing['new_battery']['sale']) ? $pricing['new_battery']['sale'] : '';
                    ?>
                    <td><input type="text" name="pricing[new_battery][regular]" value="<?php echo esc_attr($nb_reg); ?>"></td>
                    <td><input type="text" name="pricing[new_battery][sale]" value="<?php echo esc_attr($nb_sal); ?>"></td>
                </tr>
                </tbody>
            </table>

            <p class="submit">
                <button class="button button-primary">Save Rule</button>
                <a class="button" href="<?php echo esc_url(admin_url('admin.php?page=gstore_rules')); ?>">Back</a>
            </p>
        </form>
    </div>
    <?php
}

// Handlers (save/delete/clear) — all with nonce, redirect, and logs
function gstore_handle_save_rule(){
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed');
    try{
        check_admin_referer('gstore_save_rule');
        global $wpdb; $table = gstore_epp_table_rules();

        $group_key = sanitize_text_field($_POST['group_key'] ?? '');
        $device_type = sanitize_text_field($_POST['device_type'] ?? 'phone');
        $default_condition = isset($_POST['default_condition']) ? sanitize_text_field($_POST['default_condition']) : '';

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
            ], ['id'=>$exists], ['%s','%s','%s'], ['%d']);
        } else {
            $wpdb->insert($table, [
                'group_key'=>$group_key,
                'device_type'=>$device_type,
                'default_condition'=>$default_condition,
                'pricing_json'=>$json,
            ], ['%s','%s','%s','%s']);
        }
        gstore_log_debug('rule_saved', compact('group_key','device_type'));
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&updated=1') ); exit;
    } catch(\Throwable $e){
        gstore_log_error('rule_save_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&err=1') ); exit;
    }
}

function gstore_handle_delete_rule(){
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed');
    try{
        check_admin_referer('gstore_delete_rule');
        global $wpdb; $table = gstore_epp_table_rules();
        $group_key = isset($_GET['group_key']) ? sanitize_text_field($_GET['group_key']) : '';
        if ($group_key){
            $wpdb->delete($table, ['group_key'=>$group_key], ['%s']);
            gstore_log_debug('rule_deleted', ['group_key'=>$group_key]);
        }
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&updated=1') ); exit;
    } catch(\Throwable $e){
        gstore_log_error('rule_delete_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_rules&err=1') ); exit;
    }
}

function gstore_handle_clear_rules(){
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed');
    try{
        check_admin_referer('gstore_clear_rules');
        global $wpdb; $table = gstore_epp_table_rules();
        $cnt = $wpdb->query("TRUNCATE TABLE {$table}");
        gstore_log_debug('rules_cleared', ['count'=>$cnt]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&updated=1') ); exit;
    } catch(\Throwable $e){
        gstore_log_error('rules_clear_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_maint&err=1') ); exit;
    }
}

// --- Add-ons (laptops) + reset
function gstore_addons_page(){
    $row = get_option('gstore_epp_addons_laptop', ['rows'=>[]]);
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Global Add-ons (Laptops)</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success"><p>Saved.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error"><p>Error occurred. See logs.</p></div>'; ?>
        <hr class="wp-header-end" />

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_addons'); ?>
            <input type="hidden" name="action" value="gstore_save_addons">

            <table class="widefat striped" id="gstore-addons-table" style="max-width:860px;">
                <thead><tr><th>Key</th><th>Label (shown on UI)</th><th>Price (GEL)</th><th></th></tr></thead>
                <tbody>
                <?php
                $rows = isset($row['rows']) && is_array($row['rows']) ? $row['rows'] : [];
                if (!$rows) {
                    echo '<tr><td colspan="4"><em>No add-ons. Add one below.</em></td></tr>';
                } else {
                    foreach($rows as $i=>$r){
                        $k = esc_attr($r['key'] ?? '');
                        $l = esc_attr($r['label'] ?? '');
                        $p = esc_attr($r['price'] ?? '');
                        echo '<tr>';
                        echo '<td><input name="rows['.$i.'][key]" value="'.$k.'" /></td>';
                        echo '<td><input name="rows['.$i.'][label]" value="'.$l.'" /></td>';
                        echo '<td><input name="rows['.$i.'][price]" value="'.$p.'" /></td>';
                        echo '<td></td>';
                        echo '</tr>';
                    }
                }
                ?>
                <!-- empty last row for quick add -->
                <tr>
                    <td><input name="rows[new][key]" placeholder="ram-16" /></td>
                    <td><input name="rows[new][label]" placeholder="Add RAM 16GB" /></td>
                    <td><input name="rows[new][price]" placeholder="199.00" /></td>
                    <td></td>
                </tr>
                </tbody>
            </table>

            <p class="submit">
                <button class="button button-primary">Save</button>
                <a class="button" href="<?php echo esc_url( wp_nonce_url(admin_url('admin-post.php?action=gstore_save_addons&reset=1'), 'gstore_save_addons') ); ?>">Reset to defaults</a>
            </p>
        </form>
    </div>
    <?php
}

function gstore_handle_save_addons(){
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed');
    try{
        check_admin_referer('gstore_save_addons');
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
        wp_safe_redirect( admin_url('admin.php?page=gstore_addons&updated=1') ); exit;
    } catch(\Throwable $e){
        gstore_log_error('addons_save_failed',['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_addons&err=1') ); exit;
    }
}

// --- Debug page
function gstore_debug_page(){
    $full = gstore_epp_opt('debug_full', 0);
    $err  = gstore_epp_opt('debug_errors', 1);
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Debug & Logging</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success"><p>Saved.</p></div>'; ?>
        <hr class="wp-header-end" />
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('gstore_save_debug'); ?>
            <input type="hidden" name="action" value="gstore_save_debug">
            <table class="form-table">
                <tr>
                    <th>Full debug</th>
                    <td><label><input type="checkbox" name="debug_full" value="1" <?php checked($full,1); ?>> Write everything to <code>logs/fdebug.log</code></label></td>
                </tr>
                <tr>
                    <th>Error logging</th>
                    <td><label><input type="checkbox" name="debug_errors" value="1" <?php checked($err,1); ?>> Write errors to <code>logs/error.log</code></label></td>
                </tr>
            </table>
            <p class="submit"><button class="button button-primary">Save</button></p>
        </form>
    </div>
    <?php
}
function gstore_handle_save_debug(){
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed');
    try{
        check_admin_referer('gstore_save_debug');
        gstore_epp_update_opt([
            'debug_full'   => isset($_POST['debug_full'])?1:0,
            'debug_errors' => isset($_POST['debug_errors'])?1:0,
        ]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_debug&updated=1') ); exit;
    } catch(\Throwable $e){
        gstore_log_error('debug_save_failed', ['err'=>$e->getMessage()]);
        wp_safe_redirect( admin_url('admin.php?page=gstore_debug&err=1') ); exit;
    }
}

// --- Maintenance
function gstore_maint_page(){
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Maintenance</h1>
        <?php if (!empty($_GET['updated'])) echo '<div class="notice notice-success"><p>Done.</p></div>'; ?>
        <?php if (!empty($_GET['err'])) echo '<div class="notice notice-error"><p>Error. Check logs.</p></div>'; ?>
        <hr class="wp-header-end" />
        <p>Use with care.</p>
        <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>">
            <?php wp_nonce_field('gstore_clear_rules'); ?>
            <input type="hidden" name="action" value="gstore_clear_rules">
            <button class="button button-secondary" onclick="return confirm('Are you sure? This deletes ALL pricing rules.');">Clear ALL rules</button>
        </form>
    </div>
    <?php
}
