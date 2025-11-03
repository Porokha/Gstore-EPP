<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Hide Woo default product block and insert Shadow host before it.
 */
add_action('woocommerce_before_single_product', function(){
    if (!is_product()) return;
    echo '<style>.single-product div.product{display:none!important;}</style>';
    echo '<div id="gstore-epp-shadow-host"></div>';
}, 1);

/**
 * Enqueue CSS + JS on single product.
 */
add_action('wp_enqueue_scripts', function(){
    if (!is_product()) return;

    // ✅ Ensure we have a valid product
    global $post;
    $product = wc_get_product($post->ID);
    if (!$product || !is_a($product, 'WC_Product')) {
        if (defined('GSTORE_EPP_DIR')) {
            $file = GSTORE_EPP_DIR . 'logs/error.log';
            file_put_contents($file, '['.date('Y-m-d H:i:s')."] Invalid WC_Product for post {$post->ID}\n", FILE_APPEND);
        }
        return;
    }

    // Enqueue styles
    wp_enqueue_style('gstore-epp-tw', GSTORE_EPP_URL.'assets/css/tw.css', [], GSTORE_EPP_VER);
    wp_enqueue_style('gstore-epp-app', GSTORE_EPP_URL.'assets/css/app.css', ['gstore-epp-tw'], GSTORE_EPP_VER);

    // Enqueue React core (local) + ReactDOM
    wp_enqueue_script('gstore-react', GSTORE_EPP_URL.'assets/js/react.production.min.js', [], '18.3.1', true);
    wp_enqueue_script('gstore-reactdom', GSTORE_EPP_URL.'assets/js/react-dom.production.min.js', ['gstore-react'], '18.3.1', true);

    // Parse context safely
    $pid = $product->get_id();
    $ctx = function_exists('gstore_epp_parse_by_product_id')
        ? gstore_epp_parse_by_product_id($pid)
        : [];

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
        'rest'       => [
            'base'  => esc_url_raw( rest_url( 'gstore/v1' ) ),
            'nonce' => wp_create_nonce('wp_rest')
        ],
        'ajax'       => [
            'url'   => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('gstore_epp_ajax')
        ],
    ];

    // Register and inject
    wp_register_script('gstore-epp-app',
        GSTORE_EPP_URL.'assets/js/product-app.js',
        ['gstore-react','gstore-reactdom'],
        GSTORE_EPP_VER,
        true
    );

    wp_add_inline_script('gstore-epp-app', 'window.GSTORE_BOOT = '.wp_json_encode($boot).';', 'before');
    wp_enqueue_script('gstore-epp-app');

}, 20);
