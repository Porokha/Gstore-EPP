<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Hide Woo default product block and insert Shadow host.
 */
add_action('woocommerce_before_single_product', function(){
	if (!is_product()) return;

	// Hide default WooCommerce product display + theme sidebar
	echo '<style>
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
        
        /* Shadow host styling - CENTERED */
        #gstore-epp-shadow-host { 
            min-height: 500px;
            width: 100%;
            max-width: 1400px;
            display: block;
            background: #fff;
            margin: 0 auto !important;
            padding: 0 20px;
        }
    </style>';

	// Insert Shadow host
	echo '<div id="gstore-epp-shadow-host"></div>';
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

	// Enqueue React from CDN as fallback (more reliable)
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
