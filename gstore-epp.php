<?php
/*
Plugin Name: Gstore — Enhanced Product Page
Plugin URI: https://gstore.ge
Description: React-powered WooCommerce product page with unified pricing rules, add-ons, and debug tools.
Version: 1.1.1
Author: Porokha
Author URI: https://gstore.ge
Update URI: https://github.com/Porokha/gstore-epp
*/

// ===== GitHub Release Updater =====
add_filter('pre_set_site_transient_update_plugins', function($transient){
	if (empty($transient->checked)) return $transient;

	$plugin = plugin_basename(__FILE__);
	$current = $transient->checked[$plugin] ?? null;
	$api = 'https://api.github.com/repos/Porokha/Gstore-EPP/releases/latest';

	$args = [
		'timeout' => 15,
		'headers' => [
			'Accept' => 'application/vnd.github+json',
			'User-Agent' => 'WordPress/Updater'
		]
	];
	$res = wp_remote_get($api, $args);
	if (is_wp_error($res) || wp_remote_retrieve_response_code($res) != 200) return $transient;

	$body = json_decode(wp_remote_retrieve_body($res), true);
	if (!$body || empty($body['tag_name'])) return $transient;

	$new = ltrim($body['tag_name'], 'v');
	$zip = '';
	if (!empty($body['assets'])) {
		foreach ($body['assets'] as $a) {
			if (!empty($a['browser_download_url']) && str_ends_with($a['name'] ?? '', '.zip')) {
				$zip = $a['browser_download_url'];
				break;
			}
		}
	}

	if ($zip && $current && version_compare($current, $new, '<')) {
		$transient->response[$plugin] = (object)[
			'slug'        => dirname($plugin),
			'plugin'      => $plugin,
			'new_version' => $new,
			'package'     => $zip,
			'tested'      => get_bloginfo('version'),
			'url'         => 'https://github.com/Porokha/Gstore-EPP'
		];
	}
	return $transient;
});
// ===== GitHub Release Updater END =====

if (!defined('ABSPATH')) { exit; }

define('GSTORE_EPP_VER', '1.1.0');
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
