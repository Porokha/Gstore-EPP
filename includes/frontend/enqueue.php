<?php
/**
 * Frontend Enqueue - COMPLETE FIXED VERSION v4.2.3
 * Gstore EPP - Shadow DOM Setup & Asset Loading
 *
 * ALL ISSUES FIXED:
 * ✅ Asset path 404 errors (uses GSTORE_EPP_URL)
 * ✅ Shadow DOM timing (created immediately/synchronously)
 * ✅ CSS styling in Shadow DOM (uses custom CSS, not Tailwind)
 * ✅ Mobile responsive
 * ✅ Proper z-index layering
 */

if (!defined('ABSPATH')) exit;

// ============================================
// INJECT SHADOW DOM HOST - COMPLETE FIX
// ============================================
add_action('woocommerce_before_single_product', 'gstore_epp_inject_shadow_host', 5);
function gstore_epp_inject_shadow_host() {
    // Output shadow host container
    echo '<div id="gstore-epp-shadow-host"></div>';

    // CRITICAL: Create shadow DOM IMMEDIATELY (inline script runs synchronously)
    ?>
    <script>
        (function() {
            'use strict';

            console.log('Gstore EPP v4.2.3: Initializing shadow DOM...');

            const host = document.getElementById('gstore-epp-shadow-host');
            if (!host) {
                console.error('Gstore EPP: Shadow host not found');
                return;
            }

            try {
                // Create shadow root
                const shadow = host.attachShadow({mode: 'open'});
                console.log('Gstore EPP: Shadow root created');

                // Load Shadow DOM CSS (custom CSS that works in Shadow DOM)
                const mainCSS = document.createElement('link');
                mainCSS.rel = 'stylesheet';
                mainCSS.href = '<?php echo esc_url(GSTORE_EPP_URL . 'assets/css/shadow-dom.css'); ?>';
                mainCSS.onload = () => console.log('Gstore EPP: Shadow DOM CSS loaded ✅');
                mainCSS.onerror = () => console.error('Gstore EPP: Failed to load Shadow DOM CSS');
                shadow.appendChild(mainCSS);

                <?php
                // Add typography styles if configured
                $typography = get_option('gstore_epp_typography_options', []);
                if (!empty($typography['font_source']) && !empty($typography['heading_font'])) {
                    $heading_font = $typography['heading_font'];
                    $body_font = $typography['body_font'] ?? $heading_font;
                    $heading_weight = $typography['heading_weight'] ?? '600';
                    $body_weight = $typography['body_weight'] ?? '400';

                    if ($heading_font !== 'default') {
                        echo "const typoStyle = document.createElement('style');\n";
                        echo "typoStyle.textContent = `\n";
                        echo "  :host {\n";
                        echo "    --font-heading: '{$heading_font}', sans-serif;\n";
                        echo "    --font-body: '{$body_font}', sans-serif;\n";
                        echo "  }\n";
                        echo "  h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading) !important; font-weight: {$heading_weight} !important; }\n";
                        echo "  body, p, span, div, button { font-family: var(--font-body) !important; font-weight: {$body_weight}; }\n";
                        echo "`;\n";
                        echo "shadow.appendChild(typoStyle);\n";
                        echo "console.log('Gstore EPP: Typography applied');\n";
                    }
                }
                ?>

                // Create container for React app
                const container = document.createElement('div');
                container.id = 'gstore-app-root';
                container.className = 'gstore-container';
                shadow.appendChild(container);

                console.log('Gstore EPP: Shadow DOM initialized successfully! ✅');

            } catch (error) {
                console.error('Gstore EPP: Shadow DOM creation failed:', error);
            }
        })();
    </script>
    <?php

    // Hide default WooCommerce product display + Styling
    echo '<style>
		/* Hide default WooCommerce product */
		.single-product div.product {
			display: none !important;
		}

		/* Shadow host styling */
		#gstore-epp-shadow-host {
			position: relative;
			z-index: 1;
			width: 100%;
			max-width: 100vw;
			margin: 0 auto;
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

		/* Ensure footer visible */
		.site-footer,
		footer,
		.footer-wrapper {
			position: relative;
			z-index: 100;
		}

		/* Plugin content below header */
		.single-product .site-content,
		.single-product #primary,
		.single-product .content-area {
			position: relative;
			z-index: 1;
		}

		/* Mobile responsive */
		@media (max-width: 1023px) {
			#gstore-epp-shadow-host {
				padding: 0;
				overflow-x: hidden;
			}

			body.single-product {
				overflow-x: hidden;
			}
		}

		/* Desktop layout */
		@media (min-width: 1024px) {
			#gstore-epp-shadow-host {
				max-width: 1400px;
				padding: 0 20px;
			}
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

    // Get product
    $product = wc_get_product(get_the_ID());
    if (!$product) return;

    $plugin_url = GSTORE_EPP_URL;
    $plugin_version = '4.2.3'; // Updated version

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
    // BOOT DATA
    // ============================================
    $product_id = $product->get_id();
    $translations = get_option('gstore_epp_translations', []);

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
}






