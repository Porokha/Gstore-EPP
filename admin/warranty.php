<?php
if (!defined('ABSPATH')) { exit; }

// Add Warranty submenu
add_action('admin_menu', function(){
    add_submenu_page(
            'gstore_root',
            'Warranty',
            'Warranty',
            'manage_woocommerce',
            'gstore_warranty',
            'gstore_warranty_page',
            17
    );
}, 12);

function gstore_warranty_page(){
    // Handle form submission
    if (isset($_POST['gstore_warranty_submit'])) {
        check_admin_referer('gstore_warranty_settings');

        $warranty_content = wp_kses_post($_POST['warranty_content'] ?? '');
        update_option('gstore_epp_warranty_content', $warranty_content);

        echo '<div class="notice notice-success is-dismissible"><p>Warranty content saved successfully!</p></div>';
    }

    $warranty_content = get_option('gstore_epp_warranty_content', '');

    // Default content if empty
    if (empty($warranty_content)) {
        $warranty_content = '<h3>Warranty Information</h3>
<p>All products come with a <strong>1 year limited hardware warranty</strong>.</p>
<p>This warranty covers:</p>
<ul>
<li>Manufacturing defects</li>
<li>Hardware malfunctions under normal use</li>
<li>Component failures</li>
</ul>
<p>Extended warranty options are available at checkout for additional coverage.</p>
<p>For warranty claims, please contact our support team with your order number and product details.</p>';
    }

    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Warranty Settings</h1>
        <p class="description">Set the warranty information that will be displayed in the popup modal when customers click on the warranty text.</p>
        <hr class="wp-header-end" />

        <form method="post" action="">
            <?php wp_nonce_field('gstore_warranty_settings'); ?>

            <table class="form-table">
                <tbody>
                <tr>
                    <th scope="row">
                        <label for="warranty_content">Warranty Popup Content</label>
                    </th>
                    <td>
                        <?php
                        wp_editor(
                                $warranty_content,
                                'warranty_content',
                                [
                                        'textarea_name' => 'warranty_content',
                                        'textarea_rows' => 15,
                                        'media_buttons' => true,
                                        'teeny' => false,
                                        'quicktags' => true
                                ]
                        );
                        ?>
                        <p class="description">
                            This content will be displayed in a popup modal when customers click on the warranty text.<br>
                            You can use HTML formatting, lists, headings, and other rich text elements.
                        </p>
                    </td>
                </tr>
                </tbody>
            </table>

            <?php submit_button('Save Warranty Content', 'primary', 'gstore_warranty_submit'); ?>
        </form>

        <hr style="margin: 40px 0;">

        <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #2271b1;">
            <h3 style="margin-top: 0;">Preview</h3>
            <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 4px;">
                <?php echo wp_kses_post($warranty_content); ?>
            </div>
        </div>
    </div>
    <?php
}