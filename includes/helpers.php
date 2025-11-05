<?php
if (!defined('ABSPATH')) { exit; }

function gstore_epp_logs_dir(){
	return trailingslashit(GSTORE_EPP_DIR.'logs');
}
function gstore_epp_ensure_logs_dir(){
	$dir = gstore_epp_logs_dir();
	if (!is_dir($dir)) { wp_mkdir_p($dir); }
	if (is_dir($dir) && !file_exists($dir.'.htaccess')) {
		@file_put_contents($dir.'.htaccess', "Deny from all\n");
	}
}

function gstore_epp_opt($key, $default=null){
	$opts = get_option('gstore_epp_options', []);
	return isset($opts[$key]) ? $opts[$key] : $default;
}
function gstore_epp_update_opt($pairs){
	$opts = get_option('gstore_epp_options', []);
	foreach($pairs as $k=>$v){ $opts[$k] = $v; }
	update_option('gstore_epp_options', $opts, false);
}

// logging
function gstore_log_debug($msg, $ctx = []){
	if (!gstore_epp_opt('debug_full', 0)) return;
	gstore_epp_ensure_logs_dir();
	$file = gstore_epp_logs_dir().'fdebug.log';
	$line = '['.gmdate('Y-m-d H:i:s').'] DEBUG '. (is_string($msg)?$msg:wp_json_encode($msg)). ( $ctx?(' | '.wp_json_encode($ctx)) : '' ). PHP_EOL;
	@file_put_contents($file, $line, FILE_APPEND|LOCK_EX);
}
function gstore_log_error($msg, $ctx = []){
	if (!gstore_epp_opt('debug_full', 0) && !gstore_epp_opt('debug_errors', 1)) return;
	gstore_epp_ensure_logs_dir();
	$file = gstore_epp_logs_dir().'error.log';
	$line = '['.gmdate('Y-m-d H:i:s').'] ERROR '. (is_string($msg)?$msg:wp_json_encode($msg)). ( $ctx?(' | '.wp_json_encode($ctx)) : '' ). PHP_EOL;
	@file_put_contents($file, $line, FILE_APPEND|LOCK_EX);
}

// admin notice if logs dir not writable
add_action('admin_notices', function(){
	if (!current_user_can('manage_woocommerce')) return;
	$dir = gstore_epp_logs_dir();
	if (!is_dir($dir) || !is_writable($dir)){
		echo '<div class="notice notice-error"><p><strong>Gstore EPP</strong>: logs directory not writable ('.esc_html($dir).').</p></div>';
	}
});
