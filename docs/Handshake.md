Gstore EPP — System Overview, Component Logic, Architecture, & Implementation Status
Final Technical Document — Fully Merged Version Date: 2025-11-07

0) Context & Ground Rules
   •	This doc merges the first detailed architecture/status draft and the expanded component-logic draft into one authoritative spec.
   •	Per your instruction, the following are explicitly not fixed and are documented as open issues:
   ◦	Mobile spacing/alignment → ❌ Not fixed
   ◦	Header/Footer overlap (z-index) → ❌ Not fixed
   •	Database tables use your real site prefix from wp-config.php (e.g., mOUjLaS_), not hardcoded wp_:
   ◦	{$wpdb->prefix}gstore_model_rules → e.g., mOUjLaS_gstore_model_rules
   ◦	{$wpdb->prefix}gstore_laptop_addons → e.g., mOUjLaS_gstore_laptop_addons
   •	FBT and Compare are independent features. Compare search/listing is working.
   •	Sticky Bottom Bar (mobile) is not implemented yet; a precise spec is included below. Brand blue: #3A53CF.

1) Executive Summary
   Gstore EPP is a React-powered replacement for the WooCommerce single product page with Shadow DOM isolation, centralized pricing rules (including used-phone battery tiers and “New Battery” add-on), sibling switching (storage/color/condition), FBT, and Compare.
   What works now (core):
   •	✅ Shadow DOM + React app boot and render
   •	✅ Sibling switching (storage, color, condition)
   •	✅ Pricing rules (model + storage) with used tiers
   •	✅ “New Battery” add-on (used phones) end-to-end
   •	✅ REST endpoints: siblings, pricing, FBT, compare, laptop-addons
   •	✅ Add-to-cart server-side override pipeline (phones + battery add-on)
   •	✅ Compare search/listing
   •	✅ Translations & typography systems
   •	✅ FBT inheritance logic
   What’s not working or missing:
   •	❌ Mobile spacing/alignment (centering) — not fixed
   •	❌ Header/Footer overlap (z-index) — not fixed
   •	❌ Hide unavailable options (storage/tiers/colors) — not implemented
   •	❌ Battery Health dynamic text (tier midpoint) — not implemented
   •	❌ Price color bug (no discount should be black) — bug
   •	❌ Laptop add-ons UI (RAM/SSD) — not implemented
   •	❌ Sticky Bottom Bar (mobile) — not implemented

2) Project History & Timeline
   Phase 1 — MVP
   •	React app injected into Woo single product page inside Shadow DOM
   •	Basic sibling logic (storage/color/condition)
   •	Basic price display and FBT
   Phase 2 — Advanced Logic
   •	Centralized pricing per model (+storage) including used tiers
   •	“New Battery” add-on
   •	FBT inheritance (product → model-default → random accessories)
   •	Compare data structure and APIs
   •	Translations & Typography systems
   •	Global add-ons registry for laptops (DB/options layer)
   Phase 3 — Deep Rewrite / Blueprint Alignment
   •	Storage-specific tier pricing
   •	Laptop add-ons DB + REST endpoint
   •	Add-to-cart server price override (ensures cart totals match UI)
   •	Mobile-first layout intentions (still pending fixes)

3) Overall Architecture
   3.1 Frontend (React + Shadow DOM)
   •	Files: assets/js/product-app.js, assets/css/app.css, includes/frontend/enqueue.php
   •	Boot flow:
   1	Inject <div id="gstore-epp-shadow-host">
   2	Create Shadow Root; inject Tailwind + app CSS into the shadow
   3	Provide BOOT object (product context, endpoints, translations)
   4	Mount React app into the shadow root
   •	Isolation: Theme CSS cannot override component styles (by design).
   3.2 Backend (WordPress + WooCommerce)
   •	Files: gstore-epp.php, includes/common/parse.php, includes/rest/routes.php, includes/frontend/ajax.php, admin/*
   •	Responsibilities:
   ◦	Parse attributes & normalize keys (brand, model, storage, condition, device_type)
   ◦	Expose REST (siblings, pricing, fbt, compare, laptop-addons)
   ◦	Compute price server-side and override cart line-item
   ◦	Persist logs (optional), manage admin UI (rules, translations, typography)
   3.3 Database Layer (real prefix used)
   •	{$wpdb->prefix}gstore_model_rules (e.g., mOUjLaS_gstore_model_rules)
   ◦	Columns: id, group_key, device_type, pricing_json, default_condition (optional), warranty_text, updated_at
   ◦	pricing_json example:    {
   ◦	  "80-85":  { "regular": "2100", "sale": "2000" },
   ◦	  "85-90":  { "regular": "2200", "sale": ""    },
   ◦	  "90-95":  { "regular": "2300", "sale": "2250"},
   ◦	  "95-100": { "regular": "2400", "sale": ""    },
   ◦	  "new_battery": { "regular": "150", "sale": "140" }
   ◦	}
   ◦	  
   •	{$wpdb->prefix}gstore_laptop_addons (e.g., mOUjLaS_gstore_laptop_addons)
   ◦	Columns: id, scope (laptop_ram|laptop_storage), data_json, updated_at
   ◦	data_json example:    [{"label":"+16GB RAM","price":"150"},{"label":"+512GB SSD","price":"120"}]
   ◦	  
   The actual table names on your site use mOUjLaS_ prefix (from wp-config.php).

4) WooCommerce Attributes (Authoritative Inputs)
   Slug
   UI Name
   Values/Format
   Device Type
   Required
   device_type
   Device Type
   phone or laptop
   Both
   ✅
   condition
   Condition
   New, Used, Open Box
   Both
   ✅
   brand
   Brand
   Free text (e.g., Apple)
   Both
   ✅
   model
   Model
   Free text (e.g., iPhone 14 Pro)
   Both
   ✅
   storage
   Storage
   128GB, 256GB, 512GB, 1TB
   Both
   ✅
   color
   Color
   Free text (e.g., Space Black)
   Both
   ⚠️
   add_ram
   Add RAM
   (Laptop only, flags UI)
   Laptop
   ⚠️
   add_storage
   Add Storage
   (Laptop only, flags UI)
   Laptop
   ⚠️
   Normalization rules:
   •	group_key = sanitize_title(brand + ' ' + model) and append storage for storage-specific rules.
   •	Colors normalized for comparison (lowercased, spaces removed) but display original label.

5) REST API Contract (Read-Only)
   •	GET /gstore/v1/siblings?product_id={id} Returns siblings for model grouping; each: id,title,permalink,regular,sale,price,condition,brand,model,storage,color,image
   •	GET /gstore/v1/pricing?product_id={id} Returns { ok, exists, device_type, group_key, pricing, updated_at } where pricing is the decoded pricing_json.
   •	GET /gstore/v1/fbt?product_id={id} Returns up to 3 FBT products; source: product meta → model default → random Accessories.
   •	GET /gstore/v1/laptop-addons Returns two lists (laptop_ram, laptop_storage) from DB/options.
   •	GET /gstore/v1/compare-specs?product_id={id} Returns comparison scores table (if present in meta).
   Caching: Transients with ~1h TTL. Clear on product/rule updates.

6) Add-to-Cart Pipeline (Server-Authoritative Pricing)
   Frontend payload (AJAX to /?wc-ajax=gstore_epp_add_to_cart):

{
"product_id": 123,
"quantity": 1,
"condition": "used",
"tier": "90-95",
"new_battery": true,
"laptop_addons": [{"label":"+16GB RAM","price":150}]
}
Backend flow:
1	Parse payload; validate product purchasable
2	Load product context (attributes, group_key, device_type)
3	Look up model rule (storage-specific, fallback to model-level)
4	Compute base price:
◦	NEW: Woo sale/regular
◦	USED: selected tier → sale || regular
5	Add New Battery price if new_battery === true → sale || regular from pricing_json.new_battery
6	Add Laptop add-ons total if present
7	Insert line item with meta:
◦	gstore_tier, gstore_tier_price
◦	gstore_new_battery, gstore_battery_price
◦	gstore_addons, gstore_addons_price
8	Override price in woocommerce_before_calculate_totals using computed total
Guarantees cart/checkout totals match the React UI logic.

7) Frontend Components — Detailed Logic
   Each component shows: Data source → Backend retrieval → Frontend state → Rendering rules → Add-to-Cart & Override → Edge cases
   7.1 Title (Product Name)
   •	Data: Active sibling’s Woo title
   •	State: cur.title
   •	Render: H1; updates on sibling change
   7.2 Hero Image
   •	Data: Active sibling’s featured image
   •	State: cur.image
   •	Render: Single hero image (no gallery)
   7.3 Color Swatches (Mini Images)
   •	Data: Siblings filtered by cond + storage
   •	State: siblings[], cond, cur.storage
   •	Render: Only existing colors; active highlighted
   •	Edge: If none exist → show “No colors available”
   7.4 Storage Selector (Phones)
   •	Data: All storages for current cond
   •	State: storages map, cur.storage, cond
   •	Render (requested): Hide unavailable storages (currently disabled gray)
   •	Status: ❌ Not implemented
   7.5 Condition Tabs (NEW / USED / OPEN BOX)
   •	Data: Condition groups
   •	State: cond
   •	Render: Show only tabs that have ≥1 sibling
   •	Edge: Laptops may include OPEN BOX
   7.6 Battery Tiers (Phones, USED)
   •	Data: pricing_json per storage: "80-85", "85-90", "90-95", "95-100"
   •	State: rules.pricing, tier, cond, deviceType
   •	Render: Show only if deviceType='phone' && cond='used'; hide empty tiers (requested)
   •	Cart override: Base = sale || regular of selected tier
   •	Battery Health text: midpoint (e.g., 93%) → ❌ Not implemented
   7.7 New Battery (Phones, USED) — Full Logic
   •	DB: {$wpdb->prefix}gstore_model_rules.pricing_json.new_battery
   •	Backend: Included in /pricing response (not a product attribute)
   •	UI: Checkbox shows only if used phone and price exists
   •	Price: + (sale || regular) to tier base
   •	Meta: gstore_new_battery, gstore_battery_price
   •	Status: ✅ Fully implemented
   7.8 Info Row (Shipping / Warranty / Condition / Battery Health)
   •	Data:
   ◦	Shipping (attribute/fallback)
   ◦	Warranty (rule/translation)
   ◦	Condition (state)
   ◦	Battery health (tier midpoint)
   •	Status: Battery health display ❌ Not implemented
   7.9 Price Block
   •	Logic: NEW → Woo price; USED → tier (+ new battery)
   •	UI: If discounted → red sale + strike regular; else black main price
   •	Status: ❌ Bug — non-discount still red
   7.10 FBT (Frequently Bought Together)
   •	Data: Product meta → model default → random accessories
   •	Independence: Not related to Compare
   •	Status: ✅ Working
   7.11 Compare
   •	Data: /products-search, /compare-specs
   •	Status: ✅ “No product found” fixed; listing works; specs depend on data presence
   7.12 Laptop Add-Ons (RAM / Storage)
   •	Data: {$wpdb->prefix}gstore_laptop_addons or options fallback → /laptop-addons
   •	UI: ❌ Not implemented (needs checkboxes + integration)
   •	Cart override: Backend scaffolding exists; needs frontend hook-up and meta
   7.13 Tabs: Specs / Warranty / Compare (Collapsible)
   •	Behavior: Collapsed by default; toggled by tap; should re-collapse on tap again
   7.14 Layout Containers
   •	Desktop: 2-column (lg:grid-cols-2) centered max-width container
   •	Mobile: Single column; currently misaligned → ❌ Not fixed
   7.15 Shadow DOM Stacking
   •	Issue: Overlapping header/footer due to z-index
   •	Status: ❌ Not fixed

8) Mobile Sticky Bottom Bar — Authoritative Spec (Not Implemented Yet)
   Implement exactly as specified. Brand blue: #3A53CF (site blue).
   8.1 Visibility
   •	Mobile-only (< 1024px), hidden on desktop
   •	Visible on single product pages only
   8.2 Position & Layering
   •	position: fixed; left: 0; right: 0; bottom: dynamicOffset; z-index: 9999;
   •	dynamicOffset = height of theme’s footer toolbar (if present), otherwise 0
   •	Safe area padding: padding-bottom: env(safe-area-inset-bottom);
   8.3 Layout
   •	Container: grid grid-cols-[2fr_1fr] items-center gap-3 px-4 py-3 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]
   •	Left (prices):
   ◦	If discounted:
   ▪	small, gray strike regular (e.g., ₾2,380)
   ▪	big red sale (e.g., ₾2,300)
   ◦	If not discounted:
   ▪	single black main price (no red)
   •	Right (buttons):
   ◦	Add to Cart (icon-only): Square button, background: #3A53CF, white cart icon, rounded-xl, aria-label “Add to Cart”
   ◦	Buy Now (text): White background, 2px border #3A53CF, text #3A53CF, rounded-xl Label from translations key buy_now (default: “Buy Now”)
   8.4 Behavior
   •	Buttons disabled if USED and no tier selected; show small inline notice “Select a battery health tier to continue”
   •	Add to Cart → same AJAX as main CTA
   •	Buy Now → same, then redirect to checkout
   •	Prices mirror main price block (tier + new battery + future laptop add-ons)
   8.5 Errors
   •	On AJAX failure, show a toast in the sticky bar area (non-blocking)

9) Known Issues (Up-to-Date)
   •	❌ Mobile alignment (centering, padding) — Not fixed
   •	❌ Header/footer overlap (z-index stacking) — Not fixed
   •	❌ Hide unavailable (storages/tiers/colors) — Not implemented
   •	❌ Battery Health text (tier midpoint) — Not implemented
   •	❌ Price color (no discount → black) — Bug
   •	❌ Laptop add-ons UI — Not implemented
   •	❌ Sticky bottom bar — Not implemented
   •	✅ Compare listing — Working
   •	✅ FBT — Working (independent of Compare)

10) Completed Items (Confirmed)
    •	✅ Add-to-cart server override (phones + battery add-on)
    •	✅ Tier pricing, model+storage rule resolution
    •	✅ New Battery end-to-end
    •	✅ Sibling switching (condition/storage/color)
    •	✅ REST: siblings, pricing, fbt, compare, laptop-addons
    •	✅ DB: rules + laptop-addons structures
    •	✅ Shadow DOM, Tailwind isolation
    •	✅ Translations & Typography base

11) Final “Done” Definition
    •	Phones: tier ladder with hidden unavailable tiers; dynamic battery health; New Battery price; cart totals match UI; sticky bar accurate
    •	Laptops: RAM/SSD UI; add-ons included in price and cart; no phone storage UI on laptops; Open Box tab visible when present
    •	Layout: mobile centered; no header/footer overlap; desktop 2-col stable
    •	Price UI: red only when discounted; otherwise black
    •	FBT & Compare: independent, polished; translations throughout

12) Roadmap (Minimal Phases)
    Phase 1 – Layout & Visual Correctness
    •	Fix mobile centering
    •	Fix z-index overlap
    •	Fix price color bug
    •	Implement battery health text
    Phase 2 – Laptop Support (UI)
    •	Render RAM/SSD checkboxes from /laptop-addons
    •	Include add-ons in add-to-cart payload and override
    •	Suppress phone storage UI on laptops
    Phase 3 – Sticky Bottom Bar
    •	Implement per spec using #3A53CF
    •	Share price computation with main block
    •	Add translation keys
    Phase 4 – Hide Unavailable
    •	Storages, tiers, colors
    Phase 5 – QA & Polish
    •	Collapsibles re-toggle
    •	Theme toolbar detection
    •	Edge-case toasts

13) Testing Checklist
    Phones (NEW)
    •	No battery ladder visible
    •	Price shows Woo sale/regular
    •	Sticky bar mirrors price (when implemented)
    Phones (USED)
    •	Tier buttons appear; hidden unavailable
    •	Battery health shows midpoint of selection
    •	New Battery checkbox adds correct price
    •	Add-to-cart sends tier/new_battery
    •	Cart shows exact computed price
    Laptops
    •	RAM & SSD blocks visible when attributes present
    •	Add-on totals added to line price
    •	Phone storage panel is hidden
    Layout
    •	Mobile perfectly centered
    •	No header/footer overlap
    •	Desktop two-column intact
    FBT & Compare
    •	FBT toggles work
    •	Compare search & listing work
    •	Specs display when data exists
    Sticky Bar (after implemented)
    •	Sits above footer toolbar; no overlap
    •	Buttons disabled until tier chosen (used phones)
    •	Prices match main price block
    •	Buy Now redirects to checkout

14) Appendix: Pseudocode Highlights
    Battery Health (% midpoint from tier):

function batteryHealthFromTier(tier){
if(!tier) return '100%';
const [a,b] = tier.split('-').map(v => parseInt(v,10));
return Math.round((a+b)/2) + '%';
}
Cart price override (conceptual):

add_action('woocommerce_before_calculate_totals', function($cart){
foreach ($cart->get_cart() as $key => &$item) {
if (isset($item['gstore_calculated_price'])) {
$item['data']->set_price( (float) $item['gstore_calculated_price'] );
}
}
}, 10, 1);
Hide unavailable options (storage example):

const availableStorages = Object.keys(storages).filter(k => storages[k] === true);
// render only availableStorages as buttons

15) Changelog (Document)
    •	2025-11-07: Final merged spec; corrected DB prefix; clarified FBT vs Compare; added full Sticky Bar spec with brand blue #3A53CF; expanded per-component logic; documented non-fixed items as requested.

End of Document.
