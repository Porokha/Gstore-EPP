<?php
if (!defined('ABSPATH')) { exit; }

// Add Typography submenu
add_action('admin_menu', function(){
    add_submenu_page(
            'gstore_root',
            'Typography Settings',
            'Typography',
            'manage_woocommerce',
            'gstore_typography',
            'gstore_typography_page'
    );
}, 11);

// Register settings
add_action('admin_init', function(){
    register_setting('gstore_typography_settings', 'gstore_typography_options');
});

// CRITICAL: Enqueue media uploader scripts
add_action('admin_enqueue_scripts', function($hook){
    // Only load on our typography page
    if ($hook !== 'gstore_page_gstore_typography') {
        return;
    }

    // Enqueue WordPress media uploader
    wp_enqueue_media();

    // Enqueue our custom script
    wp_enqueue_script('gstore-typography-admin',
            GSTORE_EPP_URL . 'assets/js/typography-admin.js',
            ['jquery', 'media-upload', 'media-views'],
            GSTORE_EPP_VER,
            true
    );
});

// Get popular Google Fonts list
function gstore_get_google_fonts_list(){
    return [
            'Inter' => 'Inter',
            'Roboto' => 'Roboto',
            'Open Sans' => 'Open Sans',
            'Lato' => 'Lato',
            'Montserrat' => 'Montserrat',
            'Poppins' => 'Poppins',
            'Raleway' => 'Raleway',
            'Nunito' => 'Nunito',
            'PT Sans' => 'PT Sans',
            'Merriweather' => 'Merriweather',
            'Playfair Display' => 'Playfair Display',
            'Work Sans' => 'Work Sans',
            'Crimson Text' => 'Crimson Text',
            'Space Grotesk' => 'Space Grotesk',
            'DM Sans' => 'DM Sans',
            'Source Sans Pro' => 'Source Sans Pro',
            'Noto Sans' => 'Noto Sans',
            'Rubik' => 'Rubik',
            'Karla' => 'Karla',
            'IBM Plex Sans' => 'IBM Plex Sans',
            'Archivo' => 'Archivo',
            'Outfit' => 'Outfit',
            'Manrope' => 'Manrope',
            'Plus Jakarta Sans' => 'Plus Jakarta Sans',
            'Sora' => 'Sora',
            'default' => 'System Default (Inter/Sans-serif)'
    ];
}

function gstore_typography_page(){
    // Handle form submission
    if (isset($_POST['gstore_typography_submit'])) {
        check_admin_referer('gstore_typography_settings');

        $options = [
                'heading_font' => sanitize_text_field($_POST['heading_font'] ?? 'Inter'),
                'heading_weight' => sanitize_text_field($_POST['heading_weight'] ?? '600'),
                'body_font' => sanitize_text_field($_POST['body_font'] ?? 'Inter'),
                'body_weight' => sanitize_text_field($_POST['body_weight'] ?? '400'),
                'font_source' => sanitize_text_field($_POST['font_source'] ?? 'google'),
                'custom_font_url' => esc_url_raw($_POST['custom_font_url'] ?? ''),
                'heading_font_file' => esc_url_raw($_POST['heading_font_file'] ?? ''),
                'heading_font_name' => sanitize_text_field($_POST['heading_font_name'] ?? ''),
                'body_font_file' => esc_url_raw($_POST['body_font_file'] ?? ''),
                'body_font_name' => sanitize_text_field($_POST['body_font_name'] ?? ''),
                'custom_css' => wp_kses_post($_POST['custom_css'] ?? '')
        ];

        update_option('gstore_typography_options', $options, false);

        echo '<div class="notice notice-success is-dismissible"><p>Typography settings saved successfully!</p></div>';
    }

    $options = get_option('gstore_typography_options', [
            'heading_font' => 'Inter',
            'heading_weight' => '600',
            'body_font' => 'Inter',
            'body_weight' => '400',
            'font_source' => 'google',
            'custom_font_url' => '',
            'custom_css' => ''
    ]);

    $fonts = gstore_get_google_fonts_list();
    $weights = [
            '100' => 'Thin (100)',
            '200' => 'Extra Light (200)',
            '300' => 'Light (300)',
            '400' => 'Regular (400)',
            '500' => 'Medium (500)',
            '600' => 'Semi Bold (600)',
            '700' => 'Bold (700)',
            '800' => 'Extra Bold (800)',
            '900' => 'Black (900)'
    ];
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">Typography Settings</h1>
        <p class="description">Customize fonts for your Enhanced Product Pages</p>
        <hr class="wp-header-end" />

        <form method="post" action="">
            <?php wp_nonce_field('gstore_typography_settings'); ?>

            <table class="form-table">
                <!-- Font Source -->
                <tr>
                    <th scope="row">
                        <label>Font Source</label>
                    </th>
                    <td>
                        <fieldset>
                            <label>
                                <input type="radio" name="font_source" value="google" <?php checked($options['font_source'], 'google'); ?>>
                                Google Fonts (800+ fonts available)
                            </label><br>
                            <label style="margin-top: 8px; display: inline-block;">
                                <input type="radio" name="font_source" value="custom" <?php checked($options['font_source'], 'custom'); ?>>
                                Custom Font URL
                            </label>
                        </fieldset>
                    </td>
                </tr>

                <!-- Heading Font -->
                <tr>
                    <th scope="row">
                        <label for="heading_font">Heading Font</label>
                    </th>
                    <td>
                        <select id="heading_font" name="heading_font" class="regular-text">
                            <?php foreach($fonts as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($options['heading_font'], $value); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Font used for product titles and headings</p>
                    </td>
                </tr>

                <!-- Heading Weight -->
                <tr>
                    <th scope="row">
                        <label for="heading_weight">Heading Font Weight</label>
                    </th>
                    <td>
                        <select id="heading_weight" name="heading_weight">
                            <?php foreach($weights as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($options['heading_weight'], $value); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>

                <!-- Body Font -->
                <tr>
                    <th scope="row">
                        <label for="body_font">Body Font</label>
                    </th>
                    <td>
                        <select id="body_font" name="body_font" class="regular-text">
                            <?php foreach($fonts as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($options['body_font'], $value); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Font used for descriptions, prices, and general text</p>
                    </td>
                </tr>

                <!-- Body Weight -->
                <tr>
                    <th scope="row">
                        <label for="body_weight">Body Font Weight</label>
                    </th>
                    <td>
                        <select id="body_weight" name="body_weight">
                            <?php foreach($weights as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($options['body_weight'], $value); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>

                <!-- Custom Font URL -->
                <tr id="custom_font_row" style="<?php echo ($options['font_source'] === 'custom') ? '' : 'display:none;'; ?>">
                    <th scope="row">
                        <label for="custom_font_url">Custom Font URL</label>
                    </th>
                    <td>
                        <input type="url" id="custom_font_url" name="custom_font_url" value="<?php echo esc_attr($options['custom_font_url']); ?>" class="regular-text" placeholder="https://fonts.googleapis.com/css2?family=...">
                        <p class="description">Enter a custom Google Fonts URL or Adobe Fonts URL</p>
                    </td>
                </tr>

                <!-- Upload Custom Heading Font -->
                <tr id="upload_heading_font_row" style="<?php echo ($options['font_source'] === 'custom') ? '' : 'display:none;'; ?>">
                    <th scope="row">
                        <label>Upload Heading Font File</label>
                    </th>
                    <td>
                        <input type="text" id="heading_font_file" name="heading_font_file" value="<?php echo esc_attr($options['heading_font_file'] ?? ''); ?>" class="regular-text" readonly>
                        <button type="button" class="button upload-font-btn" data-target="heading_font_file">Upload .woff2 / .ttf</button>
                        <?php if (!empty($options['heading_font_file'])): ?>
                            <button type="button" class="button remove-font-btn" data-target="heading_font_file">Remove</button>
                        <?php endif; ?>
                        <p class="description">Upload custom font file for headings (recommended: .woff2 for best performance)</p>
                        <?php if (!empty($options['heading_font_file'])): ?>
                            <p class="description">Current: <a href="<?php echo esc_url($options['heading_font_file']); ?>" target="_blank">View File</a></p>
                        <?php endif; ?>
                    </td>
                </tr>

                <!-- Custom Heading Font Name -->
                <tr id="heading_font_name_row" style="<?php echo ($options['font_source'] === 'custom') ? '' : 'display:none;'; ?>">
                    <th scope="row">
                        <label for="heading_font_name">Heading Font Name</label>
                    </th>
                    <td>
                        <input type="text" id="heading_font_name" name="heading_font_name" value="<?php echo esc_attr($options['heading_font_name'] ?? ''); ?>" class="regular-text" placeholder="MyCustomFont">
                        <p class="description">Font family name (will be used in CSS). Example: "MyCustomFont" or "Brand Font Bold"</p>
                    </td>
                </tr>

                <!-- Upload Custom Body Font -->
                <tr id="upload_body_font_row" style="<?php echo ($options['font_source'] === 'custom') ? '' : 'display:none;'; ?>">
                    <th scope="row">
                        <label>Upload Body Font File</label>
                    </th>
                    <td>
                        <input type="text" id="body_font_file" name="body_font_file" value="<?php echo esc_attr($options['body_font_file'] ?? ''); ?>" class="regular-text" readonly>
                        <button type="button" class="button upload-font-btn" data-target="body_font_file">Upload .woff2 / .ttf</button>
                        <?php if (!empty($options['body_font_file'])): ?>
                            <button type="button" class="button remove-font-btn" data-target="body_font_file">Remove</button>
                        <?php endif; ?>
                        <p class="description">Upload custom font file for body text</p>
                        <?php if (!empty($options['body_font_file'])): ?>
                            <p class="description">Current: <a href="<?php echo esc_url($options['body_font_file']); ?>" target="_blank">View File</a></p>
                        <?php endif; ?>
                    </td>
                </tr>

                <!-- Custom Body Font Name -->
                <tr id="body_font_name_row" style="<?php echo ($options['font_source'] === 'custom') ? '' : 'display:none;'; ?>">
                    <th scope="row">
                        <label for="body_font_name">Body Font Name</label>
                    </th>
                    <td>
                        <input type="text" id="body_font_name" name="body_font_name" value="<?php echo esc_attr($options['body_font_name'] ?? ''); ?>" class="regular-text" placeholder="MyCustomFont">
                        <p class="description">Font family name for body text</p>
                    </td>
                </tr>

                <!-- Custom CSS -->
                <tr>
                    <th scope="row">
                        <label for="custom_css">Custom Typography CSS</label>
                    </th>
                    <td>
                        <textarea id="custom_css" name="custom_css" rows="8" class="large-text code" placeholder="/* Additional CSS for fine-tuning */
h1, h2, h3 {
    letter-spacing: -0.02em;
}
p {
    line-height: 1.6;
}"><?php echo esc_textarea($options['custom_css']); ?></textarea>
                        <p class="description">Add custom CSS to fine-tune typography (optional)</p>
                    </td>
                </tr>
            </table>

            <!-- Preview Section -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h2 style="margin-top: 0;">Live Preview</h2>
                <div id="typography-preview" style="background: white; padding: 24px; border-radius: 4px;">
                    <h1 style="font-family: <?php echo esc_attr($options['heading_font'] === 'default' ? 'Inter, sans-serif' : $options['heading_font']); ?>; font-weight: <?php echo esc_attr($options['heading_weight']); ?>; margin: 0 0 12px 0; font-size: 28px;">
                        iPhone 14 Pro Max
                    </h1>
                    <p style="font-family: <?php echo esc_attr($options['body_font'] === 'default' ? 'Inter, sans-serif' : $options['body_font']); ?>; font-weight: <?php echo esc_attr($options['body_weight']); ?>; margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Experience next-level performance with the A16 Bionic chip, stunning Super Retina XDR display with ProMotion technology, and a revolutionary 48MP camera system. The ultimate iPhone for power users.
                    </p>
                    <p style="font-family: <?php echo esc_attr($options['body_font'] === 'default' ? 'Inter, sans-serif' : $options['body_font']); ?>; font-weight: <?php echo esc_attr($options['body_weight']); ?>; margin: 16px 0 0 0; font-size: 24px; color: #dc2626;">
                        ₾2,499.00
                    </p>
                </div>
            </div>

            <p class="submit">
                <button type="submit" name="gstore_typography_submit" class="button button-primary button-large">
                    Save Typography Settings
                </button>
                <a href="<?php echo esc_url(admin_url('admin.php?page=gstore_typography&reset=1')); ?>" class="button button-large" onclick="return confirm('Reset to default typography settings?');">
                    Reset to Defaults
                </a>
            </p>
        </form>
    </div>

    <script>
        jQuery(document).ready(function($){
            // Toggle custom font fields
            $('input[name="font_source"]').on('change', function(){
                if ($(this).val() === 'custom') {
                    $('#custom_font_row, #upload_heading_font_row, #heading_font_name_row, #upload_body_font_row, #body_font_name_row').slideDown();
                } else {
                    $('#custom_font_row, #upload_heading_font_row, #heading_font_name_row, #upload_body_font_row, #body_font_name_row').slideUp();
                }
            });

            // Font uploader
            $('.upload-font-btn').on('click', function(e){
                e.preventDefault();
                var button = $(this);
                var targetInput = button.data('target');

                // Check if wp.media exists
                if (typeof wp === 'undefined' || typeof wp.media === 'undefined') {
                    alert('WordPress media uploader not loaded. Please refresh the page.');
                    return;
                }

                var mediaUploader = wp.media({
                    title: 'Upload Font File',
                    button: {
                        text: 'Use this font'
                    },
                    library: {
                        type: ['application/font-woff2', 'application/font-woff', 'application/x-font-ttf', 'font/woff2', 'font/woff', 'font/ttf', 'application/octet-stream']
                    },
                    multiple: false
                });

                mediaUploader.on('select', function(){
                    var attachment = mediaUploader.state().get('selection').first().toJSON();
                    $('#' + targetInput).val(attachment.url);

                    // Show remove button if not already there
                    if (button.next('.remove-font-btn').length === 0) {
                        button.after('<button type="button" class="button remove-font-btn" data-target="' + targetInput + '">Remove</button>');
                    }
                });

                mediaUploader.open();
            });

            // Remove font
            $(document).on('click', '.remove-font-btn', function(){
                if (confirm('Remove this font file?')) {
                    var target = $(this).data('target');
                    $('#' + target).val('');
                    $(this).remove();
                }
            });

            // Live preview updates
            function updatePreview() {
                var headingFont = $('#heading_font').val();
                var headingWeight = $('#heading_weight').val();
                var bodyFont = $('#body_font').val();
                var bodyWeight = $('#body_weight').val();

                var headingFontFamily = (headingFont === 'default') ? 'Inter, sans-serif' : headingFont + ', sans-serif';
                var bodyFontFamily = (bodyFont === 'default') ? 'Inter, sans-serif' : bodyFont + ', sans-serif';

                $('#typography-preview h1').css({
                    'font-family': headingFontFamily,
                    'font-weight': headingWeight
                });

                $('#typography-preview p').css({
                    'font-family': bodyFontFamily,
                    'font-weight': bodyWeight
                });
            }

            $('#heading_font, #heading_weight, #body_font, #body_weight').on('change', updatePreview);
        });
    </script>
    <?php
}

// Enqueue selected fonts on frontend
add_action('wp_enqueue_scripts', function(){
    if (!is_product()) return;

    $options = get_option('gstore_typography_options', []);

    if (empty($options)) return;

    $source = $options['font_source'] ?? 'google';

    if ($source === 'custom') {
        // Custom uploaded fonts
        $custom_css = '';

        if (!empty($options['heading_font_file']) && !empty($options['heading_font_name'])) {
            $custom_css .= "@font-face {
                font-family: '" . esc_attr($options['heading_font_name']) . "';
                src: url('" . esc_url($options['heading_font_file']) . "');
                font-weight: " . esc_attr($options['heading_weight'] ?? '600') . ";
                font-display: swap;
            }\n";
        }

        if (!empty($options['body_font_file']) && !empty($options['body_font_name'])) {
            $custom_css .= "@font-face {
                font-family: '" . esc_attr($options['body_font_name']) . "';
                src: url('" . esc_url($options['body_font_file']) . "');
                font-weight: " . esc_attr($options['body_weight'] ?? '400') . ";
                font-display: swap;
            }\n";
        }

        if ($custom_css) {
            wp_add_inline_style('gstore-epp-app', $custom_css);
        }

        // Also load from custom URL if provided
        if (!empty($options['custom_font_url'])) {
            wp_enqueue_style('gstore-custom-fonts', esc_url($options['custom_font_url']), [], null);
        }
    } elseif ($source === 'google') {
        // Google Fonts
        $heading = $options['heading_font'] ?? 'Inter';
        $body = $options['body_font'] ?? 'Inter';

        if ($heading !== 'default' || $body !== 'default') {
            $fonts_to_load = [];

            if ($heading !== 'default') {
                $heading_weight = $options['heading_weight'] ?? '600';
                $fonts_to_load[] = str_replace(' ', '+', $heading) . ':wght@' . $heading_weight;
            }

            if ($body !== 'default' && $body !== $heading) {
                $body_weight = $options['body_weight'] ?? '400';
                $fonts_to_load[] = str_replace(' ', '+', $body) . ':wght@' . $body_weight;
            }

            if (!empty($fonts_to_load)) {
                $font_url = 'https://fonts.googleapis.com/css2?family=' . implode('&family=', $fonts_to_load) . '&display=swap';
                wp_enqueue_style('gstore-google-fonts', $font_url, [], null);
            }
        }
    }

    // Inject custom CSS
    if (!empty($options['custom_css'])) {
        wp_add_inline_style('gstore-epp-app', $options['custom_css']);
    }
}, 25);

// Add font family CSS variables to shadow DOM
add_filter('gstore_epp_shadow_styles', function($styles){
    $options = get_option('gstore_typography_options', []);

    if (empty($options)) return $styles;

    $source = $options['font_source'] ?? 'google';

    if ($source === 'custom') {
        // Custom uploaded fonts
        $heading_font = !empty($options['heading_font_name']) ? $options['heading_font_name'] : 'Inter';
        $body_font = !empty($options['body_font_name']) ? $options['body_font_name'] : 'Inter';
    } else {
        // Google fonts
        $heading_font = $options['heading_font'] ?? 'Inter';
        $body_font = $options['body_font'] ?? 'Inter';
    }

    $heading_weight = $options['heading_weight'] ?? '600';
    $body_weight = $options['body_weight'] ?? '400';

    $heading_family = ($heading_font === 'default') ? 'Inter, sans-serif' : $heading_font . ', sans-serif';
    $body_family = ($body_font === 'default') ? 'Inter, sans-serif' : $body_font . ', sans-serif';

    $custom_styles = "
        :host {
            --font-heading: {$heading_family};
            --font-body: {$body_family};
            --weight-heading: {$heading_weight};
            --weight-body: {$body_weight};
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading) !important;
            font-weight: var(--weight-heading) !important;
        }
        body, p, span, div, button, input, label {
            font-family: var(--font-body) !important;
            font-weight: var(--weight-body);
        }
    ";

    return $styles . $custom_styles;
}, 10);
