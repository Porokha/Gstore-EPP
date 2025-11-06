<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Hide Woo default product block and insert Shadow host.
 */
add_action('woocommerce_before_single_product', function(){
	if (!is_product()) return;

	// Get typography options for inline font loading
	$typo_opts = get_option('gstore_typography_options', []);
	$font_css = '';

	// Generate @font-face CSS if custom fonts are uploaded
	if (!empty($typo_opts['font_source']) && $typo_opts['font_source'] === 'custom') {
		if (!empty($typo_opts['heading_font_file']) && !empty($typo_opts['heading_font_name'])) {
			$font_css .= "@font-face {
				font-family: '" . esc_attr($typo_opts['heading_font_name']) . "';
				src: url('" . esc_url($typo_opts['heading_font_file']) . "');
				font-weight: " . esc_attr($typo_opts['heading_weight'] ?? '600') . ";
				font-display: swap;
			}\n";
		}

		if (!empty($typo_opts['body_font_file']) && !empty($typo_opts['body_font_name'])) {
			$font_css .= "@font-face {
				font-family: '" . esc_attr($typo_opts['body_font_name']) . "';
				src: url('" . esc_url($typo_opts['body_font_file']) . "');
				font-weight: " . esc_attr($typo_opts['body_weight'] ?? '400') . ";
				font-display: swap;
			}\n";
		}
	}

	// Get font family names for CSS variables
	$heading_font = 'Inter';
	$body_font = 'Inter';

	if (!empty($typo_opts['font_source'])) {
		if ($typo_opts['font_source'] === 'custom') {
			$heading_font = $typo_opts['heading_font_name'] ?? 'Inter';
			$body_font = $typo_opts['body_font_name'] ?? 'Inter';
		} else {
			$heading_font = $typo_opts['heading_font'] ?? 'Inter';
			$body_font = $typo_opts['body_font'] ?? 'Inter';
		}
	}

	$heading_weight = $typo_opts['heading_weight'] ?? '600';
	$body_weight = $typo_opts['body_weight'] ?? '400';

	// Hide default WooCommerce product display + theme sidebar + OVERLAYS
	echo '<style>
		' . $font_css . '
		
        /* CRITICAL: Hide any overlays that might block content */
        .cdp-copy-loader-overlay,
        .loading-overlay,
        .loader-overlay,
        .site-overlay,
        .page-overlay { 
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            z-index: -1 !important;
        }
        
        /* Hide WooCommerce default product */
        .single-product div.product { display: none !important; }
        
        /* Hide theme sidebar on product pages */
        .single-product #secondary,
        .single-product .sidebar,
        .single-product aside { display: none !important; }
        
        /* Make content area full width */
        .single-product #primary,
        .single-product .content-area,
        .single-product main { 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Full width container */
        .single-product .site-content,
        .single-product .container { 
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
        }
        
        /* Shadow host styling - CENTERED with VERY HIGH Z-INDEX */
        #gstore-epp-shadow-host { 
            min-height: 500px;
            width: 100%;
            max-width: 1400px;
            display: block !important;
            background: #fff;
            margin: 0 auto !important;
            padding: 0 20px;
            position: relative !important;
            z-index: 999999 !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Apply custom fonts globally (will also work in Shadow DOM) */
        #gstore-epp-shadow-host h1,
        #gstore-epp-shadow-host h2,
        #gstore-epp-shadow-host h3,
        #gstore-epp-shadow-host h4,
        #gstore-epp-shadow-host h5,
        #gstore-epp-shadow-host h6 {
            font-family: "' . esc_attr($heading_font) . '", sans-serif !important;
            font-weight: ' . esc_attr($heading_weight) . ' !important;
        }
        
        #gstore-epp-shadow-host,
        #gstore-epp-shadow-host p,
        #gstore-epp-shadow-host span,
        #gstore-epp-shadow-host div,
        #gstore-epp-shadow-host button {
            font-family: "' . esc_attr($body_font) . '", sans-serif !important;
            font-weight: ' . esc_attr($body_weight) . ' !important;
        }
    </style>';

	// Insert Shadow host
	echo '<div id="gstore-epp-shadow-host"></div>';

	// Remove any overlay scripts that might execute
	echo '<script>
        // Force remove overlays on page load
        document.addEventListener("DOMContentLoaded", function(){
            // Remove overlay classes from body
            document.body.classList.remove("loading", "overlay-active");
            
            // Hide any overlays
            var overlays = document.querySelectorAll(".cdp-copy-loader-overlay, .loading-overlay, .loader-overlay, .site-overlay, .page-overlay");
            overlays.forEach(function(el){
                el.style.display = "none";
                el.style.opacity = "0";
                el.style.visibility = "hidden";
                el.remove();
            });
            
            // Ensure shadow host is visible
            var shadowHost = document.getElementById("gstore-epp-shadow-host");
            if (shadowHost) {
                shadowHost.style.display = "block";
                shadowHost.style.visibility = "visible";
                shadowHost.style.opacity = "1";
                shadowHost.style.zIndex = "999999";
            }
        });
        
        // Also try immediately
        setTimeout(function(){
            var overlays = document.querySelectorAll(".cdp-copy-loader-overlay, .loading-overlay");
            overlays.forEach(function(el){ el.remove(); });
        }, 100);
    </script>';
}, 1);

/**
 * Enqueue scripts and styles for product page.
 */
add_action('wp_enqueue_scripts', function(){
	if (!is_product()) return;

	global $post;
	if (!$post) {
		gstore_log_error('enqueue_no_post', ['context'=>'wp_enqueue_scripts']);
		return;
	}

	$product = wc_get_product($post->ID);
	if (!$product || !is_a($product, 'WC_Product')) {
		gstore_log_error('enqueue_invalid_product', ['post_id'=>$post->ID]);
		return;
	}

	// Enqueue styles
	wp_enqueue_style('gstore-epp-tw',
		GSTORE_EPP_URL.'assets/css/tw.css',
		[],
		GSTORE_EPP_VER
	);

	wp_enqueue_style('gstore-epp-app',
		GSTORE_EPP_URL.'assets/css/app.css',
		['gstore-epp-tw'],
		GSTORE_EPP_VER
	);

	// Enqueue React from CDN
	wp_enqueue_script('react',
		'https://unpkg.com/react@18/umd/react.production.min.js',
		[],
		'18.2.0',
		true
	);

	wp_enqueue_script('react-dom',
		'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
		['react'],
		'18.2.0',
		true
	);

	// Parse product context
	$pid = $product->get_id();
	$ctx = function_exists('gstore_epp_parse_by_product_id')
		? gstore_epp_parse_by_product_id($pid)
		: [];

	// Get hero image
	$img_id = $product->get_image_id();
	$hero = $img_id ? wp_get_attachment_image_url($img_id, 'large') : wc_placeholder_img_src('large');

	// Get translations
	$translations = get_option('gstore_epp_translations', []);

	// Get shipping time
	$shipping_time = function_exists('gstore_epp_get_shipping')
		? gstore_epp_get_shipping($pid)
		: ($translations['default_shipping'] ?? '2–3 business days');

	// Build boot data
	$boot = [
		'productId'  => $pid,
		'title'      => $product->get_title(),
		'permalink'  => get_permalink($pid),
		'price'      => $product->get_price(),
		'regular'    => $product->get_regular_price(),
		'sale'       => $product->get_sale_price(),
		'brand'      => $ctx['brand'] ?? '',
		'model'      => $ctx['model'] ?? '',
		'storage'    => $ctx['storage'] ?? '',
		'color'      => $ctx['color'] ?? '',
		'condition'  => $ctx['condition'] ?? '',
		'deviceType' => $ctx['device_type'] ?? 'phone',
		'groupKey'   => $ctx['group_key'] ?? '',
		'image'      => $hero,
		'shippingTime' => $shipping_time,
		'translations' => $translations,
		'rest'       => [
			'base'  => esc_url_raw( rest_url( 'gstore/v1' ) ),
			'nonce' => wp_create_nonce('wp_rest')
		],
		'ajax'       => [
			'url'   => admin_url('admin-ajax.php'),
			'nonce' => wp_create_nonce('gstore_epp_ajax')
		],
		'assetsCss'  => GSTORE_EPP_URL.'assets/css/tw.css',
	];

	// Global URLs for Shadow DOM
	wp_add_inline_script('react',
		'window.GSTORE_EPP_URL = '.wp_json_encode(GSTORE_EPP_URL).';
         console.log("Gstore EPP: React loaded");',
		'after'
	);

	// Register product app
	wp_register_script('gstore-epp-app',
		GSTORE_EPP_URL.'assets/js/product-app.js',
		['react','react-dom'],
		GSTORE_EPP_VER,
		true
	);

	// Inject boot data
	wp_add_inline_script('gstore-epp-app',
		'window.GSTORE_BOOT = '.wp_json_encode($boot).';
         console.log("Gstore EPP: Boot data loaded", window.GSTORE_BOOT);',
		'before'
	);

	wp_enqueue_script('gstore-epp-app');

	gstore_log_debug('enqueue_complete', [
		'pid'=>$pid,
		'ctx'=>$ctx,
		'boot_keys'=>array_keys($boot)
	]);

}, 20);

// Enqueue Google Fonts if using Google Fonts
add_action('wp_enqueue_scripts', function(){
	if (!is_product()) return;

	$options = get_option('gstore_typography_options', []);
	if (empty($options)) return;

	$source = $options['font_source'] ?? 'google';

	// Load from custom URL if provided
	if ($source === 'custom' && !empty($options['custom_font_url'])) {
		wp_enqueue_style('gstore-custom-fonts-url', esc_url($options['custom_font_url']), [], null);
	}

	// Enqueue Google Fonts
	if ($source === 'google') {
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






