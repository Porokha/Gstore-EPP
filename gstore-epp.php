<?php
/*
Plugin Name: Gstore Enhanced Product Page
Plugin URI: https://gstore.ge
Description: Pixel-perfect React product page over WooCommerce with siblings, used tiers, central add-ons, FBT, and admin rules.
Version: 1.0.1
Author: Porokha
*/
if (!defined('ABSPATH')) { exit; }

define('GSTORE_EPP_VER', '1.0.1');
define('GSTORE_EPP_DIR', plugin_dir_path(__FILE__));
define('GSTORE_EPP_URL', plugin_dir_url(__FILE__));

// --- Autoload minimal (no composer) ---
require_once GSTORE_EPP_DIR.'includes/helpers.php';
require_once GSTORE_EPP_DIR.'includes/db.php';
require_once GSTORE_EPP_DIR.'includes/common/parse.php';
require_once GSTORE_EPP_DIR.'includes/frontend/enqueue.php';
require_once GSTORE_EPP_DIR.'includes/rest/routes.php';
require_once GSTORE_EPP_DIR.'includes/frontend/ajax.php';
require_once GSTORE_EPP_DIR.'admin/menu.php';
require_once GSTORE_EPP_DIR.'admin/metabox-fbt.php';

// --- Activation: tables + logs dir ---
register_activation_hook(__FILE__, function(){
    gstore_epp_create_tables();
    gstore_epp_ensure_logs_dir();
});
