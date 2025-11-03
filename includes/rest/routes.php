<?php
if (!defined('ABSPATH')) { exit; }
require_once GSTORE_EPP_DIR.'includes/db.php';
require_once GSTORE_EPP_DIR.'includes/common/parse.php';

class GStore_EPP_REST {
    const NS = 'gstore/v1';

    public function __construct(){
        add_action('rest_api_init', [$this,'routes']);
    }

    public function routes(){
        register_rest_route(self::NS, '/pricing', [
            'methods'=>'GET',
            'permission_callback'=>'__return_true',
            'callback'=>[$this,'get_pricing'],
            'args'=>[
                'product_id'=>['required'=>true,'type'=>'integer']
            ]
        ]);

        register_rest_route(self::NS, '/siblings', [
            'methods'=>'GET',
            'permission_callback'=>'__return_true',
            'callback'=>[$this,'get_siblings'],
            'args'=>[
                'product_id'=>['required'=>true,'type'=>'integer']
            ]
        ]);
    }

    public function get_pricing(WP_REST_Request $r){
        $pid = absint($r->get_param('product_id'));
        if (!$pid) return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);
        $ctx = gstore_epp_parse_by_product_id($pid);
        global $wpdb;
        $row = $wpdb->get_row( $wpdb->prepare("SELECT * FROM ".gstore_epp_table_rules()." WHERE group_key=%s LIMIT 1", $ctx['group_key']), ARRAY_A );
        if (!$row){
            return new WP_REST_Response([
                'ok'=>true,'exists'=>false,'device_type'=>$ctx['device_type'],'group_key'=>$ctx['group_key'],'pricing'=>[]
            ], 200);
        }
        $pricing = $row['pricing_json'] ? json_decode($row['pricing_json'], true) : [];
        return new WP_REST_Response([
            'ok'=>true,'exists'=>true,
            'device_type'=>$row['device_type'],
            'group_key'=>$row['group_key'],
            'default_condition'=>$row['default_condition'],
            'pricing'=>$pricing
        ], 200);
    }

    public function get_siblings(WP_REST_Request $r){
        $pid = absint($r->get_param('product_id'));
        if (!$pid) return new WP_REST_Response(['ok'=>false,'error'=>'MISSING_PRODUCT_ID'], 400);
        $ctx = gstore_epp_parse_by_product_id($pid);

        // Group strictly by Brand + Model (storage independent)
        $brand = $ctx['brand']; $model = $ctx['model'];
        if (!$brand || !$model){
            return new WP_REST_Response(['ok'=>false,'error'=>'ATTR_INCOMPLETE','debug'=>$ctx], 200);
        }

        $q = new WP_Query([
            'post_type'=>'product',
            'posts_per_page'=>-1,
            'post_status'=>'publish',
            'meta_query'=>[
                'relation'=>'AND',
                ['key'=>'attribute_brand','value'=>$brand],
                ['key'=>'attribute_model','value'=>$model],
            ]
        ]);

        $items = [];
        if ($q->have_posts()){
            while($q->have_posts()){ $q->the_post();
                $ip = wc_get_product(get_the_ID()); if (!$ip) continue;
                $img_id = $ip->get_image_id();
                $hero = $img_id ? wp_get_attachment_image_url($img_id, 'large') : wc_placeholder_img_src('large');

                $items[] = [
                    'id'=> $ip->get_id(),
                    'title'=> $ip->get_title(),
                    'permalink'=> get_permalink($ip->get_id()),
                    'price'=> $ip->get_price(),
                    'regular'=> $ip->get_regular_price(),
                    'sale'=> $ip->get_sale_price(),
                    'condition'=> gstore_epp_attr($ip->get_id(),'condition'),
                    'brand'=> $brand,
                    'model'=> $model,
                    'storage'=> gstore_epp_attr($ip->get_id(),'storage'),
                    'color'=> gstore_epp_attr($ip->get_id(),'color'),
                    'image'=> $hero
                ];
            }
            wp_reset_postdata();
        }

        return new WP_REST_Response(['ok'=>true,'brand'=>$brand,'model'=>$model,'siblings'=>$items], 200);
    }
}
new GStore_EPP_REST();
