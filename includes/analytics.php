<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/db.php';

/**
 * Track challenge analytics event
 *
 * Event types:
 * - challenge_started: User clicked 80-85% tier to start challenge
 * - level1_completed: Flappy Bird completed (score >= 10)
 * - level1_failed: Flappy Bird failed (gave up or lost)
 * - level2_completed: Chess puzzle completed (won)
 * - level2_failed: Chess puzzle failed (AI won)
 * - level3_completed: Math question correct (tier unlocked)
 * - level3_failed: Math question wrong (all attempts used)
 * - challenge_completed: Full challenge done (80-85% unlocked)
 * - challenge_abandoned: Modal closed before completion
 */
function gstore_track_challenge_event(){
	try {
		// No nonce check - we want to track all users, even not logged in
		// This is view-only data, no security risk

		$product_id = absint($_POST['product_id'] ?? 0);
		$event_type = sanitize_text_field($_POST['event_type'] ?? '');
		$event_data = $_POST['event_data'] ?? [];

		if (!$product_id || !$event_type) {
			wp_send_json_error(['message' => 'Missing required fields'], 400);
			return;
		}

		// Validate event type
		$valid_events = [
			'challenge_started',
			'level1_completed',
			'level1_failed',
			'level2_completed',
			'level2_failed',
			'level3_completed',
			'level3_failed',
			'challenge_completed',
			'challenge_abandoned'
		];

		if (!in_array($event_type, $valid_events)) {
			wp_send_json_error(['message' => 'Invalid event type'], 400);
			return;
		}

		// Get or create session ID (stored in cookie for 24 hours)
		$session_id = $_COOKIE['gstore_session'] ?? '';
		if (!$session_id) {
			$session_id = 'gs_' . uniqid() . '_' . time();
			setcookie('gstore_session', $session_id, time() + 86400, '/'); // 24 hours
		}

		// Get user IP (with proxy support)
		$user_ip = '';
		if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
			$user_ip = $_SERVER['HTTP_CLIENT_IP'];
		} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
			$user_ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
		} else {
			$user_ip = $_SERVER['REMOTE_ADDR'] ?? '';
		}
		$user_ip = sanitize_text_field($user_ip);

		// Get user agent
		$user_agent = sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? '');

		// Sanitize event data
		$event_data_clean = [];
		if (is_array($event_data)) {
			foreach ($event_data as $key => $value) {
				$event_data_clean[sanitize_key($key)] = sanitize_text_field($value);
			}
		}

		global $wpdb;
		$table = gstore_epp_table_analytics();

		// Check if table exists - if not, fail silently to avoid 500 errors
		$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
		if (!$table_exists) {
			gstore_log_error('analytics_table_missing', ['table' => $table]);
			// Silent fail - return success to avoid breaking frontend
			wp_send_json_success(['tracked' => false, 'message' => 'Analytics table not found']);
			return;
		}

		$inserted = $wpdb->insert(
			$table,
			[
				'product_id' => $product_id,
				'event_type' => $event_type,
				'event_data' => wp_json_encode($event_data_clean),
				'session_id' => $session_id,
				'user_ip' => $user_ip,
				'user_agent' => $user_agent,
				'created_at' => current_time('mysql')
			],
			['%d', '%s', '%s', '%s', '%s', '%s', '%s']
		);

		if ($inserted === false) {
			gstore_log_error('analytics_insert_failed', ['error' => $wpdb->last_error]);
			// Silent fail - return success to avoid breaking frontend
			wp_send_json_success(['tracked' => false, 'message' => 'Database insert failed']);
			return;
		}

		wp_send_json_success(['tracked' => true, 'event' => $event_type]);

	} catch (\Throwable $e) {
		gstore_log_error('analytics_exception', ['error' => $e->getMessage()]);
		wp_send_json_error(['message' => 'Server error'], 500);
	}
}

// Register AJAX endpoint (both logged in and not logged in users)
add_action('wp_ajax_gstore_track_challenge', 'gstore_track_challenge_event');
add_action('wp_ajax_nopriv_gstore_track_challenge', 'gstore_track_challenge_event');

/**
 * Get analytics stats for dashboard
 */
function gstore_get_analytics_stats($days = 30) {
	global $wpdb;
	$table = gstore_epp_table_analytics();

	$since = date('Y-m-d H:i:s', strtotime("-{$days} days"));

	// Total challenges started
	$started = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'challenge_started' AND created_at >= %s",
		$since
	));

	// Total challenges completed
	$completed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'challenge_completed' AND created_at >= %s",
		$since
	));

	// Total challenges abandoned
	$abandoned = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'challenge_abandoned' AND created_at >= %s",
		$since
	));

	// Level 1 stats
	$level1_completed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level1_completed' AND created_at >= %s",
		$since
	));
	$level1_failed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level1_failed' AND created_at >= %s",
		$since
	));

	// Level 2 stats
	$level2_completed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level2_completed' AND created_at >= %s",
		$since
	));
	$level2_failed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level2_failed' AND created_at >= %s",
		$since
	));

	// Level 3 stats
	$level3_completed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level3_completed' AND created_at >= %s",
		$since
	));
	$level3_failed = $wpdb->get_var($wpdb->prepare(
		"SELECT COUNT(*) FROM {$table} WHERE event_type = 'level3_failed' AND created_at >= %s",
		$since
	));

	// Calculate completion rates
	$completion_rate = $started > 0 ? round(($completed / $started) * 100, 1) : 0;
	$level1_rate = ($level1_completed + $level1_failed) > 0
		? round(($level1_completed / ($level1_completed + $level1_failed)) * 100, 1)
		: 0;
	$level2_rate = ($level2_completed + $level2_failed) > 0
		? round(($level2_completed / ($level2_completed + $level2_failed)) * 100, 1)
		: 0;
	$level3_rate = ($level3_completed + $level3_failed) > 0
		? round(($level3_completed / ($level3_completed + $level3_failed)) * 100, 1)
		: 0;

	// Top products by challenge starts
	$top_products = $wpdb->get_results($wpdb->prepare(
		"SELECT product_id, COUNT(*) as starts
		FROM {$table}
		WHERE event_type = 'challenge_started' AND created_at >= %s
		GROUP BY product_id
		ORDER BY starts DESC
		LIMIT 10",
		$since
	), ARRAY_A);

	// Add product titles
	foreach ($top_products as &$row) {
		$product = wc_get_product($row['product_id']);
		$row['title'] = $product ? $product->get_title() : 'Unknown Product';
	}

	// Activity by day (last 7 days)
	$daily_activity = $wpdb->get_results($wpdb->prepare(
		"SELECT DATE(created_at) as date, event_type, COUNT(*) as count
		FROM {$table}
		WHERE created_at >= %s
		GROUP BY DATE(created_at), event_type
		ORDER BY date DESC",
		date('Y-m-d H:i:s', strtotime('-7 days'))
	), ARRAY_A);

	return [
		'started' => intval($started),
		'completed' => intval($completed),
		'abandoned' => intval($abandoned),
		'completion_rate' => $completion_rate,
		'level1' => [
			'completed' => intval($level1_completed),
			'failed' => intval($level1_failed),
			'rate' => $level1_rate
		],
		'level2' => [
			'completed' => intval($level2_completed),
			'failed' => intval($level2_failed),
			'rate' => $level2_rate
		],
		'level3' => [
			'completed' => intval($level3_completed),
			'failed' => intval($level3_failed),
			'rate' => $level3_rate
		],
		'top_products' => $top_products,
		'daily_activity' => $daily_activity,
		'period_days' => $days
	];
}
