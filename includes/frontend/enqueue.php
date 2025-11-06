<?php
/**
 * Frontend Enqueue - FIXED VERSION v4.2.1
 * Gstore EPP - Shadow DOM Setup & Asset Loading
 *
 * CRITICAL FIX: Corrected asset URL paths
 * - Changed plugin_dir_url(dirname(__FILE__)) to GSTORE_EPP_URL
 * - This fixes 404 errors for CSS and JS files
 *
 * Previous fixes:
 * - Removed excessive z-index that overlays header/footer
 * - Proper layering with theme elements
 * - Fixed mobile positioning
 * - Fixed $product global issue (fatal error fix)
 */

if (!defined('ABSPATH')) exit;

// ============================================
// INJECT SHADOW DOM HOST
// ============================================
add_action('woocommerce_before_single_product', 'gstore_epp_inject_shadow_host', 5);
function gstore_epp_inject_shadow_host() {
    // Output shadow host container
    echo '<div id="gstore-epp-shadow-host"></div>';

    // Hide default WooCommerce product display
    echo '<style>
        .single-product div.product { 
            display: none !important; 
        }
        
        /* FIX #4: Proper z-index layering */
        #gstore-epp-shadow-host {
            position: relative;
            z-index: 1; /* Normal stacking context, not overlay */
        }
        
        /* Ensure theme header stays on top */
        .site-header,
        header,
        .header-wrapper,
        .masthead,
        nav,
        .navigation {
            position: relative;
            z-index: 1000 !important;
        }
        
        /* Ensure footer stays visible */
        .site-footer,
        footer,
        .footer-wrapper {
            position: relative;
            z-index: 100;
        }
        
        /* Plugin content should be below header */
        .single-product .site-content,
        .single-product #primary,
        .single-product .content-area {
            position: relative;
            z-index: 1;
        }
    </style>';
}

// ============================================
// ENQUEUE ASSETS
// ============================================
add_action('wp_enqueue_scripts', 'gstore_epp_enqueue_assets');
function gstore_epp_enqueue_assets() {
    // Only on single product pages
    if (!is_product()) return;

    // CRITICAL FIX: Get product from current post, not global
    $product = wc_get_product(get_the_ID());
    if (!$product) return;

    // CRITICAL FIX: Use GSTORE_EPP_URL constant instead of calculating path
    // This was causing 404 errors because plugin_dir_url(dirname(__FILE__))
    // was pointing to includes/ directory instead of plugin root
    $plugin_url = GSTORE_EPP_URL;
    $plugin_version = GSTORE_EPP_VER;

    // ============================================
    // REACT & REACT-DOM (CDN)
    // ============================================
    wp_enqueue_script(
            'react',
            'https://unpkg.com/react@18/umd/react.production.min.js',
            [],
            '18.2.0',
            true
    );

    wp_enqueue_script(
            'react-dom',
            'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
            ['react'],
            '18.2.0',
            true
    );

    // ============================================
    // TAILWIND CSS (Compiled)
    // ============================================
    wp_enqueue_style(
            'gstore-epp-tailwind',
            $plugin_url . 'assets/css/tw.css',
            [],
            $plugin_version
    );

    // ============================================
    // CUSTOM STYLES
    // ============================================
    wp_enqueue_style(
            'gstore-epp-app',
            $plugin_url . 'assets/css/app.css',
            ['gstore-epp-tailwind'],
            $plugin_version
    );

    // ============================================
    // TYPOGRAPHY (if configured)
    // ============================================
    $typography = get_option('gstore_epp_typography_options', []);
    if (!empty($typography['font_source'])) {
        $inline_css = gstore_epp_generate_typography_css($typography);
        if ($inline_css) {
            wp_add_inline_style('gstore-epp-app', $inline_css);
        }
    }

    // ============================================
    // PRODUCT APP (React)
    // ============================================
    wp_enqueue_script(
            'gstore-epp-product-app',
            $plugin_url . 'assets/js/product-app.js',
            ['react', 'react-dom'],
            $plugin_version,
            true
    );

    // ============================================
    // BOOT DATA (pass to JavaScript)
    // ============================================
    $product_id = $product->get_id();

    // Get translations
    $translations = get_option('gstore_epp_translations', []);

    // Get device type
    require_once GSTORE_EPP_DIR . 'includes/common/parse.php';
    $ctx = gstore_epp_parse_by_product_id($product_id);

    $boot_data = [
            'product_id' => $product_id,
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('gstore_epp_ajax'),
            'rest_url' => rest_url('gstore/v1/'),
            'translations' => $translations,
            'device_type' => $ctx['device_type'],
            'currency_symbol' => get_woocommerce_currency_symbol(),
    ];

    wp_localize_script('gstore-epp-product-app', 'GSTORE_EPP_BOOT', $boot_data);

    // ============================================
    // SHADOW DOM STYLES
    // Inject Tailwind into Shadow DOM
    // ============================================
    add_action('wp_footer', 'gstore_epp_inject_shadow_styles', 100);
}

// ============================================
// INJECT STYLES INTO SHADOW DOM
// ============================================
function gstore_epp_inject_shadow_styles() {
    if (!is_product()) return;

    // CRITICAL FIX: Use GSTORE_EPP_URL constant
    $plugin_url = GSTORE_EPP_URL;
    ?>
    <script>
        (function() {
            'use strict';

            function initializeShadowDOM() {
                const host = document.getElementById('gstore-epp-shadow-host');
                if (!host) {
                    console.error('Gstore EPP: Shadow host not found');
                    return;
                }

                // Check if shadow root already exists
                if (host.shadowRoot) {
                    console.log('Gstore EPP: Shadow root already initialized');
                    return;
                }

                console.log('Gstore EPP: Initializing shadow DOM...');

                // Create shadow root
                const shadow = host.attachShadow({mode: 'open'});

                // Load Tailwind CSS into shadow
                const tailwindLink = document.createElement('link');
                tailwindLink.rel = 'stylesheet';
                tailwindLink.href = '<?php echo esc_url($plugin_url . 'assets/css/tw.css'); ?>';
                tailwindLink.onload = function() {
                    console.log('Gstore EPP: Tailwind CSS loaded');
                };
                tailwindLink.onerror = function() {
                    console.error('Gstore EPP: Failed to load Tailwind CSS from ' + this.href);
                };
                shadow.appendChild(tailwindLink);

                // Load custom CSS into shadow
                const appLink = document.createElement('link');
                appLink.rel = 'stylesheet';
                appLink.href = '<?php echo esc_url($plugin_url . 'assets/css/app.css'); ?>';
                appLink.onload = function() {
                    console.log('Gstore EPP: App CSS loaded');
                };
                appLink.onerror = function() {
                    console.error('Gstore EPP: Failed to load App CSS from ' + this.href);
                };
                shadow.appendChild(appLink);

                // Add typography styles if configured
                <?php
                $typography = get_option('gstore_epp_typography_options', []);
                if (!empty($typography['font_source'])) {
                    $inline_css = gstore_epp_generate_typography_css($typography);
                    if ($inline_css) {
                        echo "const typoStyle = document.createElement('style');\n";
                        echo "typoStyle.textContent = " . json_encode($inline_css) . ";\n";
                        echo "shadow.appendChild(typoStyle);\n";
                        echo "console.log('Gstore EPP: Typography styles injected');\n";
                    }
                }
                ?>

                // Create container for React app
                const container = document.createElement('div');
                container.id = 'gstore-app-root';
                container.className = 'gstore-container';
                shadow.appendChild(container);

                console.log('Gstore EPP: Shadow DOM initialized successfully');
            }

            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeShadowDOM);
            } else {
                initializeShadowDOM();
            }
        })();
    </script>
    <?php
}

// ============================================
// GENERATE TYPOGRAPHY CSS
// ============================================
function gstore_epp_generate_typography_css($typography) {
    $css = '';

    // Get font source
    $source = $typography['font_source'] ?? 'google';

    // Font families
    $heading_font = $typography['heading_font'] ?? 'Inter';
    $body_font = $typography['body_font'] ?? 'Inter';
    $heading_weight = $typography['heading_weight'] ?? '600';
    $body_weight = $typography['body_weight'] ?? '400';

    // Load Google Fonts if needed
    if ($source === 'google' && $heading_font !== 'default' && $body_font !== 'default') {
        $fonts_to_load = [];

        if ($heading_font !== 'default') {
            $fonts_to_load[] = str_replace(' ', '+', $heading_font) . ':wght@' . $heading_weight;
        }

        if ($body_font !== 'default' && $body_font !== $heading_font) {
            $fonts_to_load[] = str_replace(' ', '+', $body_font) . ':wght@' . $body_weight;
        }

        if (!empty($fonts_to_load)) {
            $font_url = 'https://fonts.googleapis.com/css2?family=' . implode('&family=', $fonts_to_load) . '&display=swap';
            $css .= "@import url('{$font_url}');\n\n";
        }
    }

    // Load custom font URL if provided
    if ($source === 'custom' && !empty($typography['custom_font_url'])) {
        $css .= "@import url('{$typography['custom_font_url']}');\n\n";
    }

    // Load uploaded fonts if provided
    if ($source === 'custom') {
        // Heading font
        if (!empty($typography['heading_font_file']) && !empty($typography['heading_font_name'])) {
            $css .= "@font-face {\n";
            $css .= "  font-family: '{$typography['heading_font_name']}';\n";
            $css .= "  src: url('{$typography['heading_font_file']}');\n";
            $css .= "  font-weight: {$heading_weight};\n";
            $css .= "  font-display: swap;\n";
            $css .= "}\n\n";
            $heading_font = $typography['heading_font_name'];
        }

        // Body font
        if (!empty($typography['body_font_file']) && !empty($typography['body_font_name'])) {
            $css .= "@font-face {\n";
            $css .= "  font-family: '{$typography['body_font_name']}';\n";
            $css .= "  src: url('{$typography['body_font_file']}');\n";
            $css .= "  font-weight: {$body_weight};\n";
            $css .= "  font-display: swap;\n";
            $css .= "}\n\n";
            $body_font = $typography['body_font_name'];
        }
    }

    // Apply fonts to elements
    $heading_family = ($heading_font === 'default') ? 'Inter, sans-serif' : "'{$heading_font}', sans-serif";
    $body_family = ($body_font === 'default') ? 'Inter, sans-serif' : "'{$body_font}', sans-serif";

    $css .= ":host {\n";
    $css .= "  --font-heading: {$heading_family};\n";
    $css .= "  --font-body: {$body_family};\n";
    $css .= "  --weight-heading: {$heading_weight};\n";
    $css .= "  --weight-body: {$body_weight};\n";
    $css .= "}\n\n";

    $css .= "h1, h2, h3, h4, h5, h6 {\n";
    $css .= "  font-family: var(--font-heading) !important;\n";
    $css .= "  font-weight: var(--weight-heading) !important;\n";
    $css .= "}\n\n";

    $css .= "body, p, span, div, button, input, textarea, select {\n";
    $css .= "  font-family: var(--font-body) !important;\n";
    $css .= "  font-weight: var(--weight-body);\n";
    $css .= "}\n\n";

    // Custom CSS if provided
    if (!empty($typography['custom_css'])) {
        $css .= $typography['custom_css'] . "\n";
    }

    return $css;
}

// ============================================
// STICKY BAR POSITIONING (Footer Toolbar Compatibility)
// ============================================
add_action('wp_footer', 'gstore_epp_sticky_bar_positioning', 110);
function gstore_epp_sticky_bar_positioning() {
    if (!is_product()) return;
    ?>
    <script>
        (function() {
            'use strict';

            function adjustStickyBar() {
                // Check for Woodmart footer toolbar or other sticky elements
                const footerToolbar = document.querySelector('.woodmart-toolbar, .footer-toolbar, .sticky-footer');
                const stickyBar = document.querySelector('#gstore-sticky-bar');

                if (!stickyBar) return;

                if (footerToolbar) {
                    const toolbarHeight = footerToolbar.offsetHeight;
                    stickyBar.style.bottom = (toolbarHeight + 10) + 'px';
                } else {
                    stickyBar.style.bottom = '0';
                }
            }

            // Adjust on load and resize
            window.addEventListener('load', adjustStickyBar);
            window.addEventListener('resize', adjustStickyBar);

            // MutationObserver for dynamic toolbar changes
            const observer = new MutationObserver(adjustStickyBar);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        })();
    </script>
    <?php
}

// ============================================
// MOBILE RESPONSIVE ADJUSTMENTS
// ============================================
add_action('wp_footer', 'gstore_epp_mobile_adjustments', 120);
function gstore_epp_mobile_adjustments() {
    if (!is_product()) return;
    ?>
    <style>
        /* Mobile-specific fixes */
        @media (max-width: 1023px) {
            #gstore-epp-shadow-host {
                /* FIX #4: Ensure proper mobile centering */
                width: 100%;
                max-width: 100vw;
                margin: 0 auto;
                padding: 0;
                overflow-x: hidden;
            }

            /* Prevent horizontal scroll */
            body.single-product {
                overflow-x: hidden;
            }

            /* Ensure shadow content is centered */
            #gstore-epp-shadow-host > * {
                max-width: 100%;
            }
        }

        /* Desktop layout */
        @media (min-width: 1024px) {
            #gstore-epp-shadow-host {
                max-width: 1400px;
                margin: 0 auto;
                padding: 0 20px;
            }
        }
    </style>
    <?php
}






