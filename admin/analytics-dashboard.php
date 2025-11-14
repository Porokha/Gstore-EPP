<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/analytics.php';

/**
 * Add Analytics Dashboard to admin menu
 */
add_action('admin_menu', function(){
	add_submenu_page(
		'gstore_root',
		'Challenge Analytics',
		'📊 Analytics',
		'manage_woocommerce',
		'gstore_analytics',
		'gstore_analytics_dashboard_page'
	);
}, 15);

/**
 * Render Analytics Dashboard
 */
function gstore_analytics_dashboard_page(){
	// Get time period from query string (default: 30 days)
	$period = isset($_GET['period']) ? absint($_GET['period']) : 30;
	$valid_periods = [7, 30, 90];
	if (!in_array($period, $valid_periods)) $period = 30;

	// Get stats
	$stats = gstore_get_analytics_stats($period);

	$updated = isset($_GET['updated']) ? true : false;
	?>
	<div class="wrap">
		<h1 class="wp-heading-inline">🎮 Challenge Analytics Dashboard</h1>

		<?php if ($updated): ?>
			<div class="notice notice-success is-dismissible"><p>Stats refreshed successfully.</p></div>
		<?php endif; ?>

		<!-- Period Selector -->
		<div style="margin: 20px 0;">
			<label for="period-select"><strong>Time Period:</strong></label>
			<select id="period-select" onchange="window.location.href='?page=gstore_analytics&period='+this.value">
				<option value="7" <?php selected($period, 7); ?>>Last 7 Days</option>
				<option value="30" <?php selected($period, 30); ?>>Last 30 Days</option>
				<option value="90" <?php selected($period, 90); ?>>Last 90 Days</option>
			</select>
		</div>

		<!-- Summary Cards -->
		<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0;">

			<!-- Card: Total Started -->
			<div style="background: #fff; border-left: 4px solid #2271b1; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<div style="font-size: 14px; color: #646970; margin-bottom: 8px;">🎯 Challenges Started</div>
				<div style="font-size: 36px; font-weight: 600; color: #1d2327;"><?php echo number_format($stats['started']); ?></div>
			</div>

			<!-- Card: Completion Rate -->
			<div style="background: #fff; border-left: 4px solid #00a32a; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<div style="font-size: 14px; color: #646970; margin-bottom: 8px;">✅ Completion Rate</div>
				<div style="font-size: 36px; font-weight: 600; color: #00a32a;"><?php echo $stats['completion_rate']; ?>%</div>
				<div style="font-size: 12px; color: #646970; margin-top: 4px;"><?php echo number_format($stats['completed']); ?> completed</div>
			</div>

			<!-- Card: Abandoned -->
			<div style="background: #fff; border-left: 4px solid #d63638; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<div style="font-size: 14px; color: #646970; margin-bottom: 8px;">❌ Abandoned</div>
				<div style="font-size: 36px; font-weight: 600; color: #d63638;"><?php echo number_format($stats['abandoned']); ?></div>
			</div>

			<!-- Card: Total Unlocked -->
			<div style="background: #fff; border-left: 4px solid #ffa500; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<div style="font-size: 14px; color: #646970; margin-bottom: 8px;">🔓 Tiers Unlocked</div>
				<div style="font-size: 36px; font-weight: 600; color: #ffa500;"><?php echo number_format($stats['completed']); ?></div>
				<div style="font-size: 12px; color: #646970; margin-top: 4px;">80-85% pricing</div>
			</div>

		</div>

		<!-- Level Performance -->
		<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">

			<!-- Level 1: Flappy Bird -->
			<div style="background: #fff; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">🐦 Level 1: Flappy Bird</h3>
				<div style="margin-bottom: 10px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="color: #646970; font-size: 13px;">Success Rate</span>
						<span style="font-weight: 600; color: <?php echo $stats['level1']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>"><?php echo $stats['level1']['rate']; ?>%</span>
					</div>
					<div style="background: #f0f0f1; height: 8px; border-radius: 4px; overflow: hidden;">
						<div style="background: <?php echo $stats['level1']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>; height: 100%; width: <?php echo $stats['level1']['rate']; ?>%;"></div>
					</div>
				</div>
				<div style="display: flex; justify-content: space-between; font-size: 13px; color: #646970;">
					<span>✅ Completed: <strong><?php echo number_format($stats['level1']['completed']); ?></strong></span>
					<span>❌ Failed: <strong><?php echo number_format($stats['level1']['failed']); ?></strong></span>
				</div>
			</div>

			<!-- Level 2: Chess -->
			<div style="background: #fff; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">♟️ Level 2: Chess</h3>
				<div style="margin-bottom: 10px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="color: #646970; font-size: 13px;">Success Rate</span>
						<span style="font-weight: 600; color: <?php echo $stats['level2']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>"><?php echo $stats['level2']['rate']; ?>%</span>
					</div>
					<div style="background: #f0f0f1; height: 8px; border-radius: 4px; overflow: hidden;">
						<div style="background: <?php echo $stats['level2']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>; height: 100%; width: <?php echo $stats['level2']['rate']; ?>%;"></div>
					</div>
				</div>
				<div style="display: flex; justify-content: space-between; font-size: 13px; color: #646970;">
					<span>✅ Completed: <strong><?php echo number_format($stats['level2']['completed']); ?></strong></span>
					<span>❌ Failed: <strong><?php echo number_format($stats['level2']['failed']); ?></strong></span>
				</div>
			</div>

			<!-- Level 3: Math -->
			<div style="background: #fff; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px;">
				<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">🧮 Level 3: Math</h3>
				<div style="margin-bottom: 10px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="color: #646970; font-size: 13px;">Success Rate</span>
						<span style="font-weight: 600; color: <?php echo $stats['level3']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>"><?php echo $stats['level3']['rate']; ?>%</span>
					</div>
					<div style="background: #f0f0f1; height: 8px; border-radius: 4px; overflow: hidden;">
						<div style="background: <?php echo $stats['level3']['rate'] >= 50 ? '#00a32a' : '#d63638'; ?>; height: 100%; width: <?php echo $stats['level3']['rate']; ?>%;"></div>
					</div>
				</div>
				<div style="display: flex; justify-content: space-between; font-size: 13px; color: #646970;">
					<span>✅ Completed: <strong><?php echo number_format($stats['level3']['completed']); ?></strong></span>
					<span>❌ Failed: <strong><?php echo number_format($stats['level3']['failed']); ?></strong></span>
				</div>
			</div>

		</div>

		<!-- Top Products -->
		<?php if (!empty($stats['top_products'])): ?>
		<div style="background: #fff; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; margin: 30px 0;">
			<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">🏆 Top Products by Challenge Starts</h3>
			<table class="wp-list-table widefat fixed striped">
				<thead>
					<tr>
						<th style="width: 60px;">Rank</th>
						<th>Product</th>
						<th style="width: 150px; text-align: right;">Challenges Started</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($stats['top_products'] as $index => $row): ?>
						<tr>
							<td><strong>#<?php echo ($index + 1); ?></strong></td>
							<td>
								<a href="<?php echo get_edit_post_link($row['product_id']); ?>" target="_blank">
									<?php echo esc_html($row['title']); ?>
								</a>
							</td>
							<td style="text-align: right; font-weight: 600; color: #2271b1;">
								<?php echo number_format($row['starts']); ?>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php endif; ?>

		<!-- Daily Activity Chart -->
		<?php if (!empty($stats['daily_activity'])): ?>
		<div style="background: #fff; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; margin: 30px 0;">
			<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">📅 Activity Last 7 Days</h3>

			<?php
			// Group by date
			$daily_grouped = [];
			foreach ($stats['daily_activity'] as $row) {
				$date = $row['date'];
				if (!isset($daily_grouped[$date])) {
					$daily_grouped[$date] = [
						'started' => 0,
						'completed' => 0,
						'abandoned' => 0
					];
				}
				if ($row['event_type'] === 'challenge_started') {
					$daily_grouped[$date]['started'] += $row['count'];
				} elseif ($row['event_type'] === 'challenge_completed') {
					$daily_grouped[$date]['completed'] += $row['count'];
				} elseif ($row['event_type'] === 'challenge_abandoned') {
					$daily_grouped[$date]['abandoned'] += $row['count'];
				}
			}
			?>

			<table class="wp-list-table widefat fixed striped">
				<thead>
					<tr>
						<th>Date</th>
						<th style="text-align: right;">Started</th>
						<th style="text-align: right;">Completed</th>
						<th style="text-align: right;">Abandoned</th>
						<th style="text-align: right;">Completion %</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($daily_grouped as $date => $counts):
						$rate = $counts['started'] > 0 ? round(($counts['completed'] / $counts['started']) * 100, 1) : 0;
					?>
						<tr>
							<td><?php echo date('F j, Y', strtotime($date)); ?></td>
							<td style="text-align: right;"><?php echo number_format($counts['started']); ?></td>
							<td style="text-align: right; color: #00a32a; font-weight: 600;"><?php echo number_format($counts['completed']); ?></td>
							<td style="text-align: right; color: #d63638;"><?php echo number_format($counts['abandoned']); ?></td>
							<td style="text-align: right; font-weight: 600;"><?php echo $rate; ?>%</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php endif; ?>

		<!-- Insights & Recommendations -->
		<div style="background: #f0f6fc; border-left: 4px solid #2271b1; padding: 20px; margin: 30px 0; border-radius: 4px;">
			<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1d2327;">💡 Insights & Recommendations</h3>
			<ul style="margin: 0; padding-left: 20px; color: #646970;">
				<?php if ($stats['completion_rate'] < 30): ?>
					<li><strong>Low completion rate (<?php echo $stats['completion_rate']; ?>%)</strong> - Consider making challenges easier or adding skip option.</li>
				<?php elseif ($stats['completion_rate'] > 70): ?>
					<li><strong>High completion rate (<?php echo $stats['completion_rate']; ?>%)</strong> - Challenges may be too easy. Consider increasing difficulty.</li>
				<?php endif; ?>

				<?php if ($stats['level1']['rate'] < 40): ?>
					<li><strong>Level 1 is difficult</strong> - Flappy Bird success rate is only <?php echo $stats['level1']['rate']; ?>%. Consider lowering target score or making gameplay easier.</li>
				<?php endif; ?>

				<?php if ($stats['level2']['rate'] < 30): ?>
					<li><strong>Chess is blocking progress</strong> - Only <?php echo $stats['level2']['rate']; ?>% win. Consider adding hints or lowering AI difficulty.</li>
				<?php endif; ?>

				<?php if ($stats['level3']['rate'] < 50): ?>
					<li><strong>Math question too hard</strong> - <?php echo $stats['level3']['rate']; ?>% success rate. Consider simpler questions or more attempts.</li>
				<?php endif; ?>

				<?php if ($stats['started'] < 10): ?>
					<li><strong>Low engagement</strong> - Only <?php echo $stats['started']; ?> challenges started in <?php echo $period; ?> days. Make the challenge more visible or enticing.</li>
				<?php endif; ?>

				<?php if (empty($daily_grouped)): ?>
					<li><strong>No recent activity</strong> - No challenges started in the last 7 days. Check if the feature is visible to users.</li>
				<?php endif; ?>
			</ul>
		</div>

		<!-- Footer -->
		<p style="color: #646970; font-size: 13px; margin-top: 40px;">
			<strong>Data Period:</strong> Last <?php echo $period; ?> days |
			<strong>Last Updated:</strong> <?php echo current_time('F j, Y g:i a'); ?> |
			<a href="?page=gstore_analytics&period=<?php echo $period; ?>&updated=1">Refresh Stats</a>
		</p>
	</div>

	<style>
		.wp-list-table th { font-weight: 600; }
		.wp-list-table td, .wp-list-table th { padding: 12px; }
	</style>
	<?php
}
