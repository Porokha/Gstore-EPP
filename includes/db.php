<?php
if (!defined('ABSPATH')) { exit; }

function gstore_epp_table_rules(){
    global $wpdb; return $wpdb->prefix.'gstore_model_rules';
}
function gstore_epp_table_addons(){
    global $wpdb; return $wpdb->prefix.'gstore_laptop_addons';
}

function gstore_epp_create_tables(){
    global $wpdb;
    require_once ABSPATH.'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();

    $sql1 = "CREATE TABLE ".gstore_epp_table_rules()." (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        group_key VARCHAR(191) NOT NULL,
        device_type VARCHAR(20) NOT NULL,
        default_condition VARCHAR(20) NULL,
        pricing_json LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY group_key_uniq (group_key)
    ) $charset;";
    dbDelta($sql1);

    $sql2 = "CREATE TABLE ".gstore_epp_table_addons()." (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        scope VARCHAR(20) NOT NULL, -- 'laptop'
        data_json LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY scope_uniq (scope)
    ) $charset;";
    dbDelta($sql2);
}
