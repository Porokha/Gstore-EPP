<?php
if (!defined('ABSPATH')) { exit; }

// Add Translations submenu
add_action('admin_menu', function(){
    add_submenu_page(
            'gstore_root',
            'Translations',
            'Translations',
            'manage_woocommerce',
            'gstore_translations',
            'gstore_translations_page',
            15
    );
}, 12);

function gstore_translations_page(){
    // Handle form submission
    if (isset($_POST['gstore_translations_submit'])) {
        check_admin_referer('gstore_translations_settings');

        $translations = [
                'installment_text' => sanitize_text_field($_POST['installment_text'] ?? ''),
                'shipping_text' => sanitize_text_field($_POST['shipping_text'] ?? ''),
                'warranty_text' => sanitize_text_field($_POST['warranty_text'] ?? ''),
                'warehouse_text' => sanitize_text_field($_POST['warehouse_text'] ?? ''),
                'warehouse_fallback' => sanitize_text_field($_POST['warehouse_fallback'] ?? ''),
                'warehouse_mobile_fallback' => sanitize_text_field($_POST['warehouse_mobile_fallback'] ?? ''),
                'condition_text' => sanitize_text_field($_POST['condition_text'] ?? ''),
                'storage_options_text' => sanitize_text_field($_POST['storage_options_text'] ?? ''),
                'condition_label' => sanitize_text_field($_POST['condition_label'] ?? ''),
                'fbt_title' => sanitize_text_field($_POST['fbt_title'] ?? ''),
                'add_new_battery' => sanitize_text_field($_POST['add_new_battery'] ?? ''),
                'new_battery_added' => sanitize_text_field($_POST['new_battery_added'] ?? ''),
                'add_button' => sanitize_text_field($_POST['add_button'] ?? ''),
                'added_button' => sanitize_text_field($_POST['added_button'] ?? ''),
                'specifications_tab' => sanitize_text_field($_POST['specifications_tab'] ?? ''),
                'delivery_tab' => sanitize_text_field($_POST['delivery_tab'] ?? ''),
                'compare_tab' => sanitize_text_field($_POST['compare_tab'] ?? ''),
                'add_to_compare' => sanitize_text_field($_POST['add_to_compare'] ?? ''),
                'condition_new' => sanitize_text_field($_POST['condition_new'] ?? ''),
                'condition_used' => sanitize_text_field($_POST['condition_used'] ?? ''),
                'add_to_cart' => sanitize_text_field($_POST['add_to_cart'] ?? ''),
                'buy_now' => sanitize_text_field($_POST['buy_now'] ?? ''),
                'default_shipping' => sanitize_text_field($_POST['default_shipping'] ?? ''),
        ];

        update_option('gstore_epp_translations', $translations);

        echo '<div class="notice notice-success is-dismissible"><p>Translations saved successfully!</p></div>';
    }

    $translations = get_option('gstore_epp_translations', []);

    // Default values
    $defaults = [
            'installment_text' => 'From ₾{amount}/month for 24 months',
            'shipping_text' => 'Shipping: 2–3 business days',
            'warranty_text' => 'Warranty: Available',
            'warehouse_text' => 'Warehouse: {location}',
            'warehouse_fallback' => 'Warehouse: Tbilisi',
            'warehouse_mobile_fallback' => 'Tbilisi',
            'condition_text' => 'Condition: {condition}',
            'storage_options_text' => 'Storage Options',
            'condition_label' => 'Condition',
            'fbt_title' => 'Frequently Bought Together',
            'add_new_battery' => '+ Add New Battery (+₾{amount})',
            'new_battery_added' => '✓ New Battery Added (+₾{amount})',
            'add_button' => '+ Add ₾{price}',
            'added_button' => '✓ Added (₾{price})',
            'specifications_tab' => 'Specifications',
            'delivery_tab' => 'Delivery',
            'compare_tab' => 'Compare',
            'add_to_compare' => 'Add Product to Compare',
            'condition_new' => 'NEW',
            'condition_used' => 'USED (A)',
            'add_to_cart' => 'Add to Cart',
            'buy_now' => 'Buy Now',
            'default_shipping' => '2–3 business days',
    ];

    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Translations</h1>
        <p class="description">Customize text displayed on product pages. Leave empty to use the default English text.</p>
        <hr class="wp-header-end" />

        <form method="post" action="">
            <?php wp_nonce_field('gstore_translations_settings'); ?>

            <table class="form-table">
                <tbody>
                <!-- Installment Text -->
                <tr>
                    <th scope="row">
                        <label for="installment_text">Installment Text</label>
                    </th>
                    <td>
                        <input type="text" id="installment_text" name="installment_text"
                               value="<?php echo esc_attr($translations['installment_text'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['installment_text']); ?>">
                        <p class="description">
                            Use <code>{amount}</code> placeholder for price.
                            Default: <strong><?php echo esc_html($defaults['installment_text']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Shipping Text -->
                <tr>
                    <th scope="row">
                        <label for="shipping_text">Shipping Info Label</label>
                    </th>
                    <td>
                        <input type="text" id="shipping_text" name="shipping_text"
                               value="<?php echo esc_attr($translations['shipping_text'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['shipping_text']); ?>">
                        <p class="description">
                            Label only (value comes from product attribute or default).
                            Default: <strong><?php echo esc_html($defaults['shipping_text']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Default Shipping Value -->
                <tr>
                    <th scope="row">
                        <label for="default_shipping">Default Shipping Time</label>
                    </th>
                    <td>
                        <input type="text" id="default_shipping" name="default_shipping"
                               value="<?php echo esc_attr($translations['default_shipping'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['default_shipping']); ?>">
                        <p class="description">
                            Fallback if the product has no shipping attribute.
                            Default: <strong><?php echo esc_html($defaults['default_shipping']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Warranty Text -->
                <tr>
                    <th scope="row">
                        <label for="warranty_text">Warranty Info Label</label>
                    </th>
                    <td>
                        <input type="text" id="warranty_text" name="warranty_text"
                               value="<?php echo esc_attr($translations['warranty_text'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['warranty_text']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['warranty_text']); ?></strong></p>
                    </td>
                </tr>

                <!-- Warehouse Text (with location) -->
                <tr>
                    <th scope="row">
                        <label for="warehouse_text">Warehouse Text (with location)</label>
                    </th>
                    <td>
                        <input type="text" id="warehouse_text" name="warehouse_text"
                               value="<?php echo esc_attr($translations['warehouse_text'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['warehouse_text']); ?>">
                        <p class="description">
                            Use <code>{location}</code> placeholder for warehouse name.
                            Default: <strong><?php echo esc_html($defaults['warehouse_text']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Warehouse Fallback (no attribute) -->
                <tr>
                    <th scope="row">
                        <label for="warehouse_fallback">Warehouse Fallback Text</label>
                    </th>
                    <td>
                        <input type="text" id="warehouse_fallback" name="warehouse_fallback"
                               value="<?php echo esc_attr($translations['warehouse_fallback'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['warehouse_fallback']); ?>">
                        <p class="description">
                            Shown when the product has no warehouse attribute (Desktop).
                            Default: <strong><?php echo esc_html($defaults['warehouse_fallback']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Warehouse Mobile Fallback -->
                <tr>
                    <th scope="row">
                        <label for="warehouse_mobile_fallback">Warehouse Fallback (Mobile)</label>
                    </th>
                    <td>
                        <input type="text" id="warehouse_mobile_fallback" name="warehouse_mobile_fallback"
                               value="<?php echo esc_attr($translations['warehouse_mobile_fallback'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['warehouse_mobile_fallback']); ?>">
                        <p class="description">
                            Shown on mobile when the product has no warehouse attribute (without a label).
                            Default: <strong><?php echo esc_html($defaults['warehouse_mobile_fallback']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Condition Text -->
                <tr>
                    <th scope="row">
                        <label for="condition_text">Condition Info Text</label>
                    </th>
                    <td>
                        <input type="text" id="condition_text" name="condition_text"
                               value="<?php echo esc_attr($translations['condition_text'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['condition_text']); ?>">
                        <p class="description">
                            Use <code>{condition}</code> placeholder.
                            Default: <strong><?php echo esc_html($defaults['condition_text']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Condition: NEW -->
                <tr>
                    <th scope="row">
                        <label for="condition_new">Condition: NEW</label>
                    </th>
                    <td>
                        <input type="text" id="condition_new" name="condition_new"
                               value="<?php echo esc_attr($translations['condition_new'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['condition_new']); ?>">
                        <p class="description">Translation for the "NEW" button. Default: <strong><?php echo esc_html($defaults['condition_new']); ?></strong></p>
                    </td>
                </tr>

                <!-- Condition: USED (A) -->
                <tr>
                    <th scope="row">
                        <label for="condition_used">Condition: USED (A)</label>
                    </th>
                    <td>
                        <input type="text" id="condition_used" name="condition_used"
                               value="<?php echo esc_attr($translations['condition_used'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['condition_used']); ?>">
                        <p class="description">Translation for the "USED (A)" button. Default: <strong><?php echo esc_html($defaults['condition_used']); ?></strong></p>
                    </td>
                </tr>

                <!-- Storage Options -->
                <tr>
                    <th scope="row">
                        <label for="storage_options_text">Storage Options Heading</label>
                    </th>
                    <td>
                        <input type="text" id="storage_options_text" name="storage_options_text"
                               value="<?php echo esc_attr($translations['storage_options_text'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['storage_options_text']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['storage_options_text']); ?></strong></p>
                    </td>
                </tr>

                <!-- Condition Label -->
                <tr>
                    <th scope="row">
                        <label for="condition_label">Condition Heading</label>
                    </th>
                    <td>
                        <input type="text" id="condition_label" name="condition_label"
                               value="<?php echo esc_attr($translations['condition_label'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['condition_label']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['condition_label']); ?></strong></p>
                    </td>
                </tr>

                <!-- FBT Title -->
                <tr>
                    <th scope="row">
                        <label for="fbt_title">FBT Section Title</label>
                    </th>
                    <td>
                        <input type="text" id="fbt_title" name="fbt_title"
                               value="<?php echo esc_attr($translations['fbt_title'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['fbt_title']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['fbt_title']); ?></strong></p>
                    </td>
                </tr>

                <!-- Add New Battery -->
                <tr>
                    <th scope="row">
                        <label for="add_new_battery">Add New Battery Button</label>
                    </th>
                    <td>
                        <input type="text" id="add_new_battery" name="add_new_battery"
                               value="<?php echo esc_attr($translations['add_new_battery'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['add_new_battery']); ?>">
                        <p class="description">
                            Use <code>{amount}</code> placeholder.
                            Default: <strong><?php echo esc_html($defaults['add_new_battery']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- New Battery Added -->
                <tr>
                    <th scope="row">
                        <label for="new_battery_added">New Battery Added (Active)</label>
                    </th>
                    <td>
                        <input type="text" id="new_battery_added" name="new_battery_added"
                               value="<?php echo esc_attr($translations['new_battery_added'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['new_battery_added']); ?>">
                        <p class="description">
                            Use <code>{amount}</code> placeholder.
                            Default: <strong><?php echo esc_html($defaults['new_battery_added']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- FBT Add Button -->
                <tr>
                    <th scope="row">
                        <label for="add_button">FBT Add Button</label>
                    </th>
                    <td>
                        <input type="text" id="add_button" name="add_button"
                               value="<?php echo esc_attr($translations['add_button'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['add_button']); ?>">
                        <p class="description">
                            Use <code>{price}</code> placeholder.
                            Default: <strong><?php echo esc_html($defaults['add_button']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- FBT Added Button -->
                <tr>
                    <th scope="row">
                        <label for="added_button">FBT Added Button (Active)</label>
                    </th>
                    <td>
                        <input type="text" id="added_button" name="added_button"
                               value="<?php echo esc_attr($translations['added_button'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['added_button']); ?>">
                        <p class="description">
                            Use <code>{price}</code> placeholder.
                            Default: <strong><?php echo esc_html($defaults['added_button']); ?></strong>
                        </p>
                    </td>
                </tr>

                <!-- Add to Cart -->
                <tr>
                    <th scope="row">
                        <label for="add_to_cart">Add to Cart Button</label>
                    </th>
                    <td>
                        <input type="text" id="add_to_cart" name="add_to_cart"
                               value="<?php echo esc_attr($translations['add_to_cart'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['add_to_cart']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['add_to_cart']); ?></strong></p>
                    </td>
                </tr>

                <!-- Buy Now -->
                <tr>
                    <th scope="row">
                        <label for="buy_now">Buy Now Button</label>
                    </th>
                    <td>
                        <input type="text" id="buy_now" name="buy_now"
                               value="<?php echo esc_attr($translations['buy_now'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['buy_now']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['buy_now']); ?></strong></p>
                    </td>
                </tr>

                <!-- Default Warranty Content -->
                <tr>
                    <th scope="row">
                        <label for="default_warranty_content">Default Warranty Content</label>
                    </th>
                    <td>
                        <textarea id="default_warranty_content" name="default_warranty_content" rows="4" class="large-text"><?php echo esc_textarea($translations['default_warranty_content'] ?? ''); ?></textarea>
                        <p class="description">
                            Default warranty text is shown if the model has no specific warranty set.
                            Default: <strong>1 year limited hardware warranty. Extended warranty options are available at checkout.</strong>
                        </p>
                    </td>
                </tr>

                <!-- Tab: Specifications -->
                <tr>
                    <th scope="row">
                        <label for="specifications_tab">Tab: Specifications</label>
                    </th>
                    <td>
                        <input type="text" id="specifications_tab" name="specifications_tab"
                               value="<?php echo esc_attr($translations['specifications_tab'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['specifications_tab']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['specifications_tab']); ?></strong></p>
                    </td>
                </tr>

                <!-- Tab: Delivery -->
                <tr>
                    <th scope="row">
                        <label for="delivery_tab">Tab: Delivery</label>
                    </th>
                    <td>
                        <input type="text" id="delivery_tab" name="delivery_tab"
                               value="<?php echo esc_attr($translations['delivery_tab'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['delivery_tab']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['delivery_tab']); ?></strong></p>
                    </td>
                </tr>

                <!-- Tab: Compare -->
                <tr>
                    <th scope="row">
                        <label for="compare_tab">Tab: Compare</label>
                    </th>
                    <td>
                        <input type="text" id="compare_tab" name="compare_tab"
                               value="<?php echo esc_attr($translations['compare_tab'] ?? ''); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr($defaults['compare_tab']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['compare_tab']); ?></strong></p>
                    </td>
                </tr>

                <!-- Add to Compare -->
                <tr>
                    <th scope="row">
                        <label for="add_to_compare">Add to Compare Button</label>
                    </th>
                    <td>
                        <input type="text" id="add_to_compare" name="add_to_compare"
                               value="<?php echo esc_attr($translations['add_to_compare'] ?? ''); ?>"
                               class="large-text"
                               placeholder="<?php echo esc_attr($defaults['add_to_compare']); ?>">
                        <p class="description">Default: <strong><?php echo esc_html($defaults['add_to_compare']); ?></strong></p>
                    </td>
                </tr>

                </tbody>
            </table>

            <p class="submit">
                <button type="submit" name="gstore_translations_submit" class="button button-primary button-large">
                    Save Translations
                </button>
                <a href="<?php echo esc_url(admin_url('admin.php?page=gstore_translations&reset=1')); ?>"
                   class="button button-large"
                   onclick="return confirm('Reset all translations to default English?');">
                    Reset to Defaults
                </a>
            </p>
        </form>
    </div>
    <?php
}

// Handle reset
add_action('admin_init', function(){
    if (isset($_GET['page']) && $_GET['page'] === 'gstore_translations' && isset($_GET['reset'])) {
        if (current_user_can('manage_woocommerce')) {
            delete_option('gstore_epp_translations');
            wp_safe_redirect(admin_url('admin.php?page=gstore_translations&updated=1'));
            exit;
        }
    }
});
