# Gstore EPP - REST API Documentation

## Overview

This document describes the REST API endpoints available in the Gstore EPP plugin for integration with external systems like POS applications.

**Base URL**: `https://your-site.com/wp-json/gstore/v1`

All endpoints return JSON responses with the following structure:
- Success: `{"ok": true, ...data}`
- Error: `{"ok": false, "error": "error_message"}`

---

## Endpoints

### 1. Get Battery Tier Pricing

Retrieve battery tier pricing and new battery addon pricing for a specific product.

**Endpoint**: `GET /pricing`

**Parameters**:
- `product_id` (required, integer) - WooCommerce product ID

**Example Request**:
```
GET /wp-json/gstore/v1/pricing?product_id=123
```

**Example Response**:
```json
{
  "ok": true,
  "pricing": {
    "90-95": {
      "regular": "2500",
      "sale": "2300"
    },
    "85-90": {
      "regular": "2300",
      "sale": "2100"
    },
    "80-85": {
      "regular": "2100",
      "sale": "1900"
    },
    "new_battery": {
      "regular": "150",
      "sale": "140"
    }
  },
  "warranty_text": "90 days warranty on all devices"
}
```

**Response Fields**:
- `pricing` (object) - Contains battery tier ranges and new battery addon
  - `{tier_range}` (object) - Battery health tier (e.g., "90-95", "85-90", "80-85")
    - `regular` (string) - Regular price
    - `sale` (string) - Sale price (use this if lower than regular)
  - `new_battery` (object) - New battery addon pricing for phones
    - `regular` (string) - Regular addon price
    - `sale` (string) - Sale addon price
- `warranty_text` (string) - Warranty information text

**Notes**:
- For "USED" condition products, select a battery tier and use its price
- For "NEW" condition products, use the product's regular WooCommerce price
- New battery addon is only applicable to phones in "USED" condition
- Final price = tier price + (new_battery price if selected)

---

### 2. Get Laptop Add-ons

Retrieve available laptop RAM and storage upgrade options.

**Endpoint**: `GET /laptop-addons`

**Parameters**: None

**Example Request**:
```
GET /wp-json/gstore/v1/laptop-addons
```

**Example Response**:
```json
{
  "ok": true,
  "laptop_ram": [
    {
      "key": "ram_16gb",
      "label": "16GB RAM",
      "price": "200"
    },
    {
      "key": "ram_32gb",
      "label": "32GB RAM",
      "price": "400"
    }
  ],
  "laptop_storage": [
    {
      "key": "storage_512gb",
      "label": "512GB SSD",
      "price": "150"
    },
    {
      "key": "storage_1tb",
      "label": "1TB SSD",
      "price": "300"
    }
  ]
}
```

**Response Fields**:
- `laptop_ram` (array) - Available RAM upgrade options
  - `key` (string) - Unique identifier for the addon
  - `label` (string) - Display label
  - `price` (string) - Addon price
- `laptop_storage` (array) - Available storage upgrade options
  - `key` (string) - Unique identifier for the addon
  - `label` (string) - Display label
  - `price` (string) - Addon price

**Notes**:
- These addons are only applicable to laptop products
- Multiple addons can be selected (one RAM + one storage)
- Final price = base price + RAM price + storage price

---

## Database Structure

### Table: `wp_gstore_model_rules`

Stores battery tier pricing and warranty information per product model.

**Schema**:
```sql
CREATE TABLE wp_gstore_model_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_key VARCHAR(191) NOT NULL UNIQUE,
    device_type VARCHAR(20) NOT NULL,
    default_condition VARCHAR(20) NULL,
    pricing_json LONGTEXT NULL,
    warranty_text TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Fields**:
- `group_key` - Unique identifier combining model + storage (e.g., "iphone14pro 256gb")
- `device_type` - Either "phone" or "laptop"
- `pricing_json` - JSON string containing battery tier pricing
- `warranty_text` - Warranty information displayed to customers

**Example `pricing_json` format**:
```json
{
  "90-95": {"regular": "2500", "sale": "2300"},
  "85-90": {"regular": "2300", "sale": "2100"},
  "80-85": {"regular": "2100", "sale": "1900"},
  "75-80": {"regular": "1900", "sale": "1700"},
  "new_battery": {"regular": "150", "sale": "140"}
}
```

---

### Table: `wp_gstore_laptop_addons`

Stores laptop RAM and storage upgrade options.

**Schema**:
```sql
CREATE TABLE wp_gstore_laptop_addons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scope VARCHAR(20) NOT NULL UNIQUE,
    data_json LONGTEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Fields**:
- `scope` - Typically "global" for globally available addons
- `data_json` - JSON string containing addon options

**Example `data_json` format**:
```json
{
  "rows": [
    {"key": "ram_16gb", "label": "16GB RAM", "price": "200"},
    {"key": "ram_32gb", "label": "32GB RAM", "price": "400"},
    {"key": "storage_512gb", "label": "512GB SSD", "price": "150"},
    {"key": "storage_1tb", "label": "1TB SSD", "price": "300"}
  ]
}
```

---

## Product Conditions

Products can have three conditions:

1. **NEW** - Brand new product
   - Use product's regular WooCommerce price
   - No battery tier selection
   - No new battery addon

2. **OPEN BOX** - Open box product
   - Use product's regular WooCommerce price
   - No battery tier selection
   - No new battery addon

3. **USED (A)** - Used/refurbished product
   - Must select battery tier (90-95%, 85-90%, etc.)
   - Can optionally add new battery addon (phones only)
   - Price comes from `pricing_json` in database

---

## Price Calculation Examples

### Example 1: iPhone with Battery Tier + New Battery
```
Product: iPhone 14 Pro 256GB (USED condition)
Selected tier: 90-95% (sale: 2300 GEL)
New battery: Yes (sale: 140 GEL)

Final Price = 2300 + 140 = 2440 GEL
```

### Example 2: Laptop with RAM and Storage Addons
```
Product: MacBook Pro (NEW condition, base price: 3000 GEL)
RAM addon: 32GB RAM (400 GEL)
Storage addon: 1TB SSD (300 GEL)

Final Price = 3000 + 400 + 300 = 3700 GEL
```

### Example 3: New iPhone (No Addons)
```
Product: iPhone 15 Pro Max (NEW condition)
Base price: 3500 GEL

Final Price = 3500 GEL
```

---

## Integration Notes for POS Systems

### Cart Item Format

When adding items to WooCommerce cart, use this format:

**For Phones (USED condition)**:
```php
$cart_item_data = [
    'gstore_cond' => 'used',
    'gstore_tier' => '90-95',  // Battery tier
    'gstore_new_battery' => 'yes',  // or 'no'
    'gstore_calculated_price' => 2440.00  // Pre-calculated price
];
```

**For Laptops with Addons**:
```php
$cart_item_data = [
    'gstore_cond' => 'new',
    'gstore_addons' => [
        'total' => 700.00,
        'items' => [
            ['key' => 'ram_32gb', 'label' => '32GB RAM', 'price' => '400'],
            ['key' => 'storage_1tb', 'label' => '1TB SSD', 'price' => '300']
        ]
    ]
];
```

### Direct Database Queries

If you need to query the database directly from your POS system:

**Get pricing for a product**:
```sql
SELECT pricing_json, warranty_text
FROM wp_gstore_model_rules
WHERE group_key = 'iphone14pro 256gb'
LIMIT 1;
```

**Get all laptop addons**:
```sql
SELECT data_json
FROM wp_gstore_laptop_addons
WHERE scope = 'global'
LIMIT 1;
```

---

## Error Handling

All endpoints may return errors in this format:

```json
{
  "ok": false,
  "error": "Error description"
}
```

Common errors:
- `PRODUCT_NOT_FOUND` - Invalid product_id
- `NO_PRICING_DATA` - No pricing rules configured for this product
- `INVALID_PARAMETERS` - Missing or invalid request parameters

---

## Rate Limiting

Currently, there are no rate limits on these endpoints. However, for production use, consider implementing caching on your POS system side to minimize API calls.

---

## Support

For questions or issues with the API, please contact the development team or refer to the plugin source code:
- `/includes/rest/routes.php` - API endpoint definitions
- `/includes/frontend/ajax.php` - Cart and pricing logic
- `/includes/db.php` - Database table definitions

**Last Updated**: 2025-12-04
