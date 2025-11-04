<?php
/*
Plugin Name: Gstore — Enhanced Product Page
Plugin URI: https://gstore.ge
Description: React-powered WooCommerce product page with unified pricing rules, add-ons, and debug tools.
Version: 1.0.2
Author: Porokha
Author URI: https://gstore.ge
Update URI: https://github.com/Porokha/gstore-epp
*/

// ===== GitHub Release Updater (Gstore-EPP) =====
add_filter('pre_set_site_transient_update_plugins', function($transient){
	if (empty($transient->checked)) return $transient;

	$plugin = plugin_basename(__FILE__);
	$current = $transient->checked[$plugin] ?? null;

	// CHANGE BELOW TO YOUR GITHUB USERNAME / REPO
	$api = 'https://api.github.com/repos/Porokha/gstore-epp/releases/latest';

	$args = [
		'timeout' => 12,
		'headers' => [
			'Accept' => 'application/vnd.github+json',
			'User-Agent' => 'WordPress/Updater'
		]
	];
	if (defined('QMC_GITHUB_TOKEN') && QMC_GITHUB_TOKEN) {
		$args['headers']['Authorization'] = 'Bearer '.QMC_GITHUB_TOKEN;
	}

	$res = wp_remote_get($api, $args);
	if (is_wp_error($res) || wp_remote_retrieve_response_code($res) != 200) return $transient;

	$body = json_decode(wp_remote_retrieve_body($res), true);
	if (!$body || empty($body['tag_name'])) return $transient;

	$new = ltrim($body['tag_name'], 'v');
	$zip = '';
	if (!empty($body['assets'])) {
		foreach ($body['assets'] as $a) {
			if (!empty($a['browser_download_url']) && str_ends_with($a['name'] ?? '', '.zip')) {
				$zip = $a['browser_download_url']; break;
			}
		}
	}
	if (!$zip && !empty($body['zipball_url'])) $zip = $body['zipball_url'];

	if ($zip && $current && version_compare($current, $new, '<')) {
		$transient->response[$plugin] = (object)[
			'slug'        => dirname($plugin),
			'plugin'      => $plugin,
			'new_version' => $new,
			'package'     => $zip,
			'tested'      => get_bloginfo('version'),
			'url'         => 'https://github.com/Porokha/gstore-epp',
		];
	}
	return $transient;
});

add_filter('plugins_api', function($res, $action, $args){
	if ($action !== 'plugin_information') return $res;
	if ($args->slug !== dirname(plugin_basename(__FILE__))) return $res;

	$api = 'https://api.github.com/repos/Porokha/gstore-epp/releases/latest';
	$args_http = [
		'timeout' => 12,
		'headers' => [
			'Accept' => 'application/vnd.github+json',
			'User-Agent' => 'WordPress/Updater'
		]
	];
	if (defined('QMC_GITHUB_TOKEN') && QMC_GITHUB_TOKEN) {
		$args_http['headers']['Authorization'] = 'Bearer '.QMC_GITHUB_TOKEN;
	}
	$r = wp_remote_get($api, $args_http);
	if (is_wp_error($r) || wp_remote_retrieve_response_code($r) != 200) return $res;
	$b = json_decode(wp_remote_retrieve_body($r), true);

	$zip = '';
	if (!empty($b['assets'])) {
		foreach ($b['assets'] as $a) {
			if (!empty($a['browser_download_url']) && str_ends_with($a['name'] ?? '', '.zip')) {
				$zip = $a['browser_download_url']; break;
			}
		}
	}
	if (!$zip && !empty($b['zipball_url'])) $zip = $b['zipball_url'];

	return (object)[
		'name' => 'Gstore — Enhanced Product Page',
		'slug' => dirname(plugin_basename(__FILE__)),
		'version' => ltrim($b['tag_name'] ?? '', 'v'),
		'download_link' => $zip,
		'sections' => [
			'description' => 'Auto-updating plugin from GitHub Releases. React-powered WooCommerce product page with pricing rules, add-ons, and debug tools.'
		]
	];
}, 10, 3);

add_filter('http_request_args', function($args, $url){
	if (defined('QMC_GITHUB_TOKEN') && QMC_GITHUB_TOKEN) {
		if (strpos($url, 'github.com') !== false || strpos($url, 'api.github.com') !== false) {
			$args['headers']['Authorization'] = 'Bearer '.QMC_GITHUB_TOKEN;
			$args['headers']['User-Agent'] = 'WordPress/Updater';
			$args['headers']['Accept'] = 'application/octet-stream';
		}
	}
	return $args;
}, 10, 2);

// =====================================================


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
