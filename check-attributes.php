<?php
/**
 * Check how Model attribute is stored
 * Visit: https://gstore.ge/wp-content/plugins/gstore-epp/check-attributes.php?product_id=71632
 */

require_once('../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

$pid = isset($_GET['product_id']) ? absint($_GET['product_id']) : 0;
if (!$pid) die('Usage: ?product_id=71632');

$product = wc_get_product($pid);
if (!$product) die('Product not found');

?>
<!DOCTYPE html>
<html>
<head>
    <title>Attribute Check - Product #<?php echo $pid; ?></title>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        h2 { color: #333; border-bottom: 2px solid #0073aa; padding-bottom: 10px; }
        .section { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f9f9f9; }
        .success { color: #46b450; }
        .error { color: #dc3232; }
        .warning { color: #f0b849; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Attribute Storage Check - Product #<?php echo $pid; ?></h1>

    <div class="section">
        <h2>Product Info</h2>
        <p><strong>Title:</strong> <?php echo $product->get_title(); ?></p>
        <p><strong>Type:</strong> <?php echo $product->get_type(); ?></p>
        <p><strong>Status:</strong> <?php echo $product->get_status(); ?></p>
        <p><strong>Stock:</strong> <?php echo $product->is_in_stock() ? '<span class="success">In Stock</span>' : '<span class="error">Out of Stock</span>'; ?></p>
    </div>

    <div class="section">
        <h2>WooCommerce Attributes</h2>
        <table>
            <tr>
                <th>Attribute Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Taxonomy</th>
                <th>Visible</th>
            </tr>
            <?php
            $attributes = $product->get_attributes();
            if (empty($attributes)) {
                echo '<tr><td colspan="5" class="error">No attributes found!</td></tr>';
            } else {
                foreach ($attributes as $attr_name => $attr) {
                    $is_taxonomy = $attr->is_taxonomy();
                    $taxonomy = $is_taxonomy ? $attr->get_name() : 'N/A';
                    $options = $attr->get_options();

                    if ($is_taxonomy) {
                        $terms = wc_get_product_terms($pid, $taxonomy, ['fields' => 'names']);
                        $value = is_array($terms) ? implode(', ', $terms) : 'None';
                    } else {
                        $value = is_array($options) ? implode(', ', $options) : $options;
                    }

                    echo '<tr>';
                    echo '<td><strong>' . esc_html($attr_name) . '</strong></td>';
                    echo '<td>' . ($is_taxonomy ? '<span class="success">Taxonomy</span>' : '<span class="warning">Custom</span>') . '</td>';
                    echo '<td>' . esc_html($value) . '</td>';
                    echo '<td>' . esc_html($taxonomy) . '</td>';
                    echo '<td>' . ($attr->get_visible() ? 'Yes' : 'No') . '</td>';
                    echo '</tr>';
                }
            }
            ?>
        </table>
    </div>

    <div class="section">
        <h2>Taxonomy Terms (pa_model)</h2>
        <?php
        $model_terms = wc_get_product_terms($pid, 'pa_model', ['fields' => 'all']);
        if (is_wp_error($model_terms)) {
            echo '<p class="error">Error: ' . $model_terms->get_error_message() . '</p>';
        } elseif (empty($model_terms)) {
            echo '<p class="error">❌ No pa_model taxonomy terms assigned!</p>';
            echo '<p><strong>This is the problem!</strong> The product needs a Model taxonomy term.</p>';
        } else {
            echo '<table>';
            echo '<tr><th>Term ID</th><th>Name</th><th>Slug</th><th>Taxonomy</th></tr>';
            foreach ($model_terms as $term) {
                echo '<tr>';
                echo '<td>' . $term->term_id . '</td>';
                echo '<td><strong>' . $term->name . '</strong></td>';
                echo '<td>' . $term->slug . '</td>';
                echo '<td>' . $term->taxonomy . '</td>';
                echo '</tr>';
            }
            echo '</table>';
        }
        ?>
    </div>

    <div class="section">
        <h2>Post Meta (Model)</h2>
        <table>
            <tr><th>Meta Key</th><th>Meta Value</th></tr>
            <?php
            global $wpdb;
            $meta_keys = ['attribute_model', 'attribute_pa_model', '_product_attributes'];
            foreach ($meta_keys as $key) {
                $value = get_post_meta($pid, $key, true);
                if ($value) {
                    echo '<tr>';
                    echo '<td>' . esc_html($key) . '</td>';
                    echo '<td><pre>' . print_r($value, true) . '</pre></td>';
                    echo '</tr>';
                }
            }
            ?>
        </table>
    </div>

    <div class="section">
        <h2>🔧 Solution</h2>
        <?php
        $model_terms = wc_get_product_terms($pid, 'pa_model');
        if (empty($model_terms) || is_wp_error($model_terms)):
        ?>
            <p class="error"><strong>Problem:</strong> Product doesn't have a Model taxonomy term assigned.</p>
            <p><strong>Fix in WordPress Admin:</strong></p>
            <ol>
                <li>Go to Products → Attributes</li>
                <li>Create attribute: "Model" (slug: pa_model)</li>
                <li>Check "Enable Archives?"</li>
                <li>Go to Products → Attributes → Model → Configure terms</li>
                <li>Add term: "Samsung Galaxy S23 Plus"</li>
                <li>Edit this product (#<?php echo $pid; ?>)</li>
                <li>In Attributes tab → Select "Model" dropdown → Choose "Samsung Galaxy S23 Plus"</li>
                <li>Check "Used for variations" if variable product</li>
                <li>Check "Visible on product page"</li>
                <li>Click "Save attributes" then "Update"</li>
            </ol>
        <?php else: ?>
            <p class="success">✅ Model taxonomy is configured correctly!</p>
        <?php endif; ?>
    </div>

    <div class="section">
        <h2>Find Other Products with Same Model</h2>
        <?php
        // Try to find products with matching model
        global $wpdb;

        // Method 1: Taxonomy
        $model_slug = 'samsung-galaxy-s23-plus';
        $sql = "SELECT DISTINCT p.ID, p.post_title
                FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
                INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
                WHERE p.post_type = 'product'
                AND p.post_status = 'publish'
                AND tt.taxonomy = 'pa_model'
                AND t.slug = %s
                LIMIT 20";

        $products = $wpdb->get_results($wpdb->prepare($sql, $model_slug));

        if ($products) {
            echo '<p class="success">Found ' . count($products) . ' products with Model taxonomy "' . $model_slug . '":</p>';
            echo '<table><tr><th>ID</th><th>Title</th></tr>';
            foreach ($products as $p) {
                echo '<tr><td>' . $p->ID . '</td><td>' . esc_html($p->post_title) . '</td></tr>';
            }
            echo '</table>';
        } else {
            echo '<p class="error">No products found with Model taxonomy slug "' . $model_slug . '"</p>';
        }
        ?>
    </div>
</body>
</html>
