<?php
/**
 * Debug Siblings Helper
 * Add this file to plugin root, then visit: https://gstore.ge/wp-content/plugins/gstore-epp/debug-siblings.php?product_id=71636
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
if (!current_user_can('manage_options')) {
    die('Access denied. Admin only.');
}

$product_id = isset($_GET['product_id']) ? absint($_GET['product_id']) : 0;

if (!$product_id) {
    die('Usage: debug-siblings.php?product_id=71636');
}

// Clear cache for this product
delete_transient('gstore_siblings_' . $product_id);

// Make debug API call
$url = rest_url('gstore/v1/siblings?product_id=' . $product_id . '&debug=1');
$response = wp_remote_get($url);
$data = json_decode(wp_remote_retrieve_body($response), true);

?>
<!DOCTYPE html>
<html>
<head>
    <title>Siblings Debug - Product #<?php echo $product_id; ?></title>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        .section { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .label { font-weight: bold; color: #0073aa; }
        .error { color: #dc3232; }
        .success { color: #46b450; }
        pre { background: #f0f0f0; padding: 10px; overflow-x: auto; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f9f9f9; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🔍 Siblings Debug for Product #<?php echo $product_id; ?></h1>

    <div class="section">
        <h2>Product Context</h2>
        <?php if (isset($data['_debug']['context'])): ?>
            <table>
                <tr><th>Attribute</th><th>Value</th></tr>
                <?php foreach ($data['_debug']['context'] as $key => $value): ?>
                    <tr>
                        <td><?php echo $key; ?></td>
                        <td><?php echo $value ? "<strong>$value</strong>" : '<span class="error">EMPTY</span>'; ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        <?php endif; ?>
    </div>

    <div class="section">
        <h2>Database Query Results</h2>
        <p><span class="label">Model Slug:</span> <?php echo $data['_debug']['model_slug'] ?? 'N/A'; ?></p>
        <p><span class="label">Products Queried:</span> <?php echo $data['_debug']['queried_count'] ?? 0; ?></p>
        <p><span class="label">Siblings Found:</span> <strong><?php echo $data['_debug']['found_count'] ?? 0; ?></strong></p>
        <p><span class="label">Filtered Out:</span> <?php echo $data['_debug']['filtered_count'] ?? 0; ?></p>

        <?php if (!empty($data['_debug']['queried_product_ids'])): ?>
            <p><span class="label">Queried IDs:</span> <?php echo implode(', ', $data['_debug']['queried_product_ids']); ?></p>
        <?php endif; ?>
    </div>

    <?php if (!empty($data['_debug']['filtered_products'])): ?>
    <div class="section">
        <h2 class="error">⚠️ Filtered Products (Why They Were Excluded)</h2>
        <table>
            <tr>
                <th>Product ID</th>
                <th>Reason</th>
                <th>Details</th>
            </tr>
            <?php foreach ($data['_debug']['filtered_products'] as $filtered): ?>
                <tr>
                    <td><?php echo $filtered['id']; ?></td>
                    <td><?php echo $filtered['reason']; ?></td>
                    <td>
                        <?php
                        if (isset($filtered['title'])) echo $filtered['title'];
                        if (isset($filtered['expected_model'])) echo "Expected: {$filtered['expected_model']}, Found: {$filtered['found_model']}";
                        ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </table>
    </div>
    <?php endif; ?>

    <div class="section">
        <h2 class="success">✅ Found Siblings (<?php echo count($data['siblings'] ?? []); ?>)</h2>
        <?php if (!empty($data['siblings'])): ?>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Storage</th>
                    <th>Color</th>
                    <th>Condition</th>
                </tr>
                <?php foreach ($data['siblings'] as $sibling): ?>
                    <tr>
                        <td><?php echo $sibling['id']; ?></td>
                        <td><?php echo $sibling['title']; ?></td>
                        <td><?php echo $sibling['storage']; ?></td>
                        <td><?php echo $sibling['color']; ?></td>
                        <td><?php echo $sibling['condition_raw']; ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        <?php else: ?>
            <p class="error">No siblings found!</p>
        <?php endif; ?>
    </div>

    <div class="section">
        <h2>Full JSON Response</h2>
        <pre><?php echo json_encode($data, JSON_PRETTY_PRINT); ?></pre>
    </div>

    <div class="section">
        <h3>Test Other Products:</h3>
        <p>
            <a href="?product_id=71632">Product 71632</a> |
            <a href="?product_id=71636">Product 71636</a> |
            <a href="?product_id=71758">Product 71758</a>
        </p>
    </div>
</body>
</html>
