<?php
if (!defined('ABSPATH')) { exit; }

// Add Delivery submenu
add_action('admin_menu', function(){
    add_submenu_page(
            'gstore_root',
            'Delivery',
            'Delivery',
            'manage_woocommerce',
            'gstore_delivery',
            'gstore_delivery_page',
            16
    );
}, 12);

function gstore_delivery_page(){
    // Handle form submission
    if (isset($_POST['gstore_delivery_submit'])) {
        check_admin_referer('gstore_delivery_settings');

        $delivery_texts = [];

        // Save all delivery texts
        foreach ($_POST as $key => $value) {
            if (strpos($key, 'delivery_') === 0 && $key !== 'delivery_new_warehouse') {
                $warehouse = str_replace('delivery_', '', $key);
                $delivery_texts[$warehouse] = wp_kses_post($value);
            }
        }

        update_option('gstore_epp_delivery_texts', $delivery_texts);

        // Clear delivery cache
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_delivery_%'");

        echo '<div class="notice notice-success is-dismissible"><p>Delivery texts saved successfully!</p></div>';
    }

    // Handle adding new warehouse
    if (isset($_POST['gstore_add_warehouse'])) {
        check_admin_referer('gstore_delivery_settings');

        $new_warehouse = sanitize_text_field($_POST['delivery_new_warehouse'] ?? '');
        if (!empty($new_warehouse)) {
            $delivery_texts = get_option('gstore_epp_delivery_texts', []);
            $warehouse_key = strtolower($new_warehouse);

            if (!isset($delivery_texts[$warehouse_key])) {
                $delivery_texts[$warehouse_key] = '';
                update_option('gstore_epp_delivery_texts', $delivery_texts);
                echo '<div class="notice notice-success is-dismissible"><p>Warehouse added successfully!</p></div>';
            } else {
                echo '<div class="notice notice-warning is-dismissible"><p>Warehouse already exists!</p></div>';
            }
        }
    }

    // Handle removing warehouse
    if (isset($_GET['remove_warehouse'])) {
        check_admin_referer('remove_warehouse_' . $_GET['remove_warehouse']);

        $warehouse_to_remove = sanitize_text_field($_GET['remove_warehouse']);
        $delivery_texts = get_option('gstore_epp_delivery_texts', []);

        if (isset($delivery_texts[$warehouse_to_remove]) && $warehouse_to_remove !== 'default') {
            unset($delivery_texts[$warehouse_to_remove]);
            update_option('gstore_epp_delivery_texts', $delivery_texts);

            // Clear cache
            delete_transient('gstore_delivery_' . $warehouse_to_remove);

            echo '<div class="notice notice-success is-dismissible"><p>Warehouse removed successfully!</p></div>';
        }
    }

    $delivery_texts = get_option('gstore_epp_delivery_texts', []);

    // Ensure default exists
    if (!isset($delivery_texts['default'])) {
        $delivery_texts['default'] = 'Standard delivery: 2-3 business days.';
    }

    // Ensure common warehouses exist
    if (!isset($delivery_texts['tbilisi'])) {
        $delivery_texts['tbilisi'] = '';
    }
    if (!isset($delivery_texts['usa'])) {
        $delivery_texts['usa'] = '';
    }

    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Delivery Settings</h1>
        <p class="description">Set delivery information text for each warehouse location. The text will be displayed in the Delivery tab on product pages based on the product's warehouse attribute.</p>
        <hr class="wp-header-end" />

        <form method="post" action="">
            <?php wp_nonce_field('gstore_delivery_settings'); ?>

            <table class="form-table">
                <tbody>
                <?php foreach ($delivery_texts as $warehouse => $text): ?>
                    <tr>
                        <th scope="row">
                            <label for="delivery_<?php echo esc_attr($warehouse); ?>">
                                <?php
                                if ($warehouse === 'default') {
                                    echo 'Default Delivery Text';
                                } else {
                                    echo 'Warehouse: ' . esc_html(ucfirst($warehouse));
                                }
                                ?>
                            </label>
                            <?php if ($warehouse !== 'default'): ?>
                                <br>
                                <a href="<?php echo wp_nonce_url(add_query_arg('remove_warehouse', $warehouse), 'remove_warehouse_' . $warehouse); ?>"
                                   class="button button-small"
                                   style="margin-top: 5px; color: #b32d2e;"
                                   onclick="return confirm('Are you sure you want to remove this warehouse?');">
                                    Remove
                                </a>
                            <?php endif; ?>
                        </th>
                        <td>
                            <?php
                            wp_editor(
                                    $text,
                                    'delivery_' . $warehouse,
                                    [
                                            'textarea_name' => 'delivery_' . $warehouse,
                                            'textarea_rows' => 6,
                                            'media_buttons' => false,
                                            'teeny' => true,
                                            'quicktags' => true
                                    ]
                            );
                            ?>
                            <p class="description">
                                <?php
                                if ($warehouse === 'default') {
                                    echo 'Fallback text shown when no specific warehouse text is set.';
                                } else {
                                    echo 'Shown when product has warehouse attribute: <code>' . esc_html($warehouse) . '</code>';
                                }
                                ?>
                            </p>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>

            <?php submit_button('Save Delivery Texts', 'primary', 'gstore_delivery_submit'); ?>
        </form>

        <hr style="margin: 40px 0;">

        <h2>Add New Warehouse</h2>
        <form method="post" action="" style="max-width: 600px;">
            <?php wp_nonce_field('gstore_delivery_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="delivery_new_warehouse">Warehouse Name</label>
                    </th>
                    <td>
                        <input type="text"
                               id="delivery_new_warehouse"
                               name="delivery_new_warehouse"
                               class="regular-text"
                               placeholder="e.g., Dubai, London, Tokyo">
                        <p class="description">Enter the warehouse name (will be converted to lowercase for matching).</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Add Warehouse', 'secondary', 'gstore_add_warehouse'); ?>
        </form>
    </div>
    <?php
}