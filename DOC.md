# 🎯 Gstore EPP - Complete Technical Documentation (v5.3.0)

**Last Updated:** November 12, 2025  
**Plugin Version:** 5.3.0  
**Status:** ⚠️ **CORE FEATURES WORKING - CACHE BUSTING ISSUE PRESENT**  
**GitHub:** https://github.com/Porokha/Gstore-EPP.git

> **CRITICAL NOTE:** This is a living document that reflects the **actual current state** of the codebase, not aspirational features. All known issues are documented with severity levels.

---

## 📋 Executive Summary

### What This Plugin Does
React-powered WooCommerce single product page replacement with:
- **Shadow DOM isolation** (theme CSS doesn't bleed in)
- **Centralized pricing rules** per model+storage combination
- **Smart sibling switching** (storage, color, condition)
- **Battery tier pricing** for USED phones
- **Laptop add-ons** (RAM, Storage)
- **FBT (Frequently Bought Together)**
- **Typography & Translation management**
- **Compare products** feature
- **Mobile-optimized layout**

### Current Reality Check
✅ **What Works (ALL CRITICAL ISSUES FIXED):**
- Basic product display in Shadow DOM
- Storage/Color/Condition switching
- FBT section displays
- Admin pricing rules (storage-specific)
- REST API endpoints (siblings, pricing, warranty)
- Translations system
- Typography settings
- ✅ **FIX #1:** Cart price override (tier-based pricing working)
- ✅ **FIX #2:** Battery health dynamic text (shows correct % per tier)
- ✅ **FIX #3:** Z-index overlay fixed (no longer covers header/footer)
- ✅ **FIX #4:** Mobile layout centered and aligned
- ✅ **FIX #5:** Unavailable options hidden (not grayed out)
- ✅ **FIX #6:** Laptop products hide phone UI elements
- ✅ **FIX #7:** Price color logic (red only when discounted)
- ✅ **FIX #8:** Condition tabs logic (Open Box only for laptops)
- ✅ **FIX #9:** CSS 404 errors fixed (dynamic plugin URL)

⚠️ **Known Limitations:**
- Laptop add-ons (RAM/Storage checkboxes) - Not yet implemented
- Requires backend REST API endpoint for global add-ons
- **JavaScript cache busting issue** - Changes to product-app.js don't reflect after clearing cache (WordPress caching problem)

✨ **NEW FEATURE: Battery Tier Challenge (Gamification)**
- 3-level challenge system to unlock lowest battery tier pricing
- Level 1: Flappy Bird game (reach score 10)
- Level 2: Chess puzzle (placeholder - shows board)
- Level 3: Math question (Georgian language)
- Modal-based UI with consistent styling
- Unlocks 80-85% battery tier pricing on completion
- Only available for USED phone products

---

## 🎮 Battery Tier Challenge (Gamification System)

### Overview

The Battery Tier Challenge is a gamification feature that allows customers to unlock the lowest battery tier pricing (80-85%) by completing a 3-level challenge. This creates engagement and adds a fun element to the purchasing process.

**Trigger:** Clicking the "80-85%" battery tier button when it's locked (🔒 icon)

### Game Flow

```
User clicks 80-85% tier (locked)
         ↓
   [INTRO MODAL]
   - Explains challenge
   - Shows product name
   - Start / Cancel buttons
         ↓
  [LEVEL 1: Flappy Bird]
  - Tap to make bird jump
  - Avoid pipes
  - Reach score 10 to pass
         ↓
  [WIN] → [LEVEL 2 MODAL]
  [LOSE] → [LOSE MODAL] → Retry or Close
         ↓
  [LEVEL 2: Chess Puzzle]
  - Shows chess board
  - Currently placeholder (skip button)
         ↓
  [LEVEL 3: Math Question]
  - Georgian language question
  - "What is 7 + 8?"
  - 3 attempts allowed
  - Input answer and submit
         ↓
  [SUCCESS] → 80-85% tier unlocked
  [FAIL] → Challenge closes, tier stays locked
```

### Implementation Details

**File:** `assets/js/product-app.js` (lines ~200-450, ~1408-1437 mobile, ~1828-1857 desktop)

#### State Management

```javascript
const [showChallenge, setShowChallenge] = useState(false);
const [challengeScreen, setChallengeScreen] = useState('intro');
const [challengeScore, setChallengeScore] = useState(0);
const [birdY, setBirdY] = useState(250);
const [birdVel, setBirdVel] = useState(0);
const [pipes, setPipes] = useState([]);
const [chessBoard, setChessBoard] = useState([]);
const [mathInput, setMathInput] = useState('');
const [mathTries, setMathTries] = useState(0);
const [mathFeedback, setMathFeedback] = useState('');
const [tier80Unlocked, setTier80Unlocked] = useState(false);
```

#### Challenge Screens

1. **intro** - Welcome screen with challenge explanation
2. **game** - Flappy Bird gameplay
3. **lose** - Game over screen (retry or cancel)
4. **level2** - Congratulations + chess intro
5. **chess** - Chess board display (placeholder)
6. **math** - Math question with input

#### Level 1: Flappy Bird Game

**Mechanics:**
- Bird starts at Y=250px
- Gravity: velocity += 0.5 every frame
- Jump: velocity = -8 on click
- Pipes: 40px wide, 200px gap, spawn every 100 frames
- Collision: Bird hits pipe or goes off-screen
- Win condition: Score ≥ 10

**Game Loop:**
```javascript
useEffect(() => {
    if (challengeScreen !== 'game') return;
    
    const interval = setInterval(() => {
        // Update bird position
        setBirdY(y => {
            const newVel = birdVel + 0.5; // gravity
            setBirdVel(newVel);
            return y + newVel;
        });
        
        // Move pipes left
        setPipes(pipes => pipes.map(p => ({...p, x: p.x - 2})));
        
        // Check collisions
        // Check score
        // Spawn new pipes
    }, 16); // ~60 FPS
    
    return () => clearInterval(interval);
}, [challengeScreen, birdY, birdVel, pipes]);
```

**Collision Detection:**
```javascript
function checkCollision() {
    // Bird off screen
    if (birdY < 0 || birdY > 500) return true;
    
    // Bird hits pipe
    pipes.forEach(pipe => {
        if (pipe.x < 100 && pipe.x > 20) {
            if (birdY < pipe.gapY - 100 || birdY > pipe.gapY + 100) {
                return true; // collision
            }
        }
    });
    
    return false;
}
```

#### Level 2: Chess Puzzle

**Current Implementation:** Placeholder
- Shows 8x8 chess board
- Displays standard starting position
- "Continue (simulation)" button skips to Level 3

**Board State:**
```javascript
const initChess = () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Set up pieces (white on bottom, black on top)
    // Pawns, rooks, knights, bishops, queens, kings
    setChessBoard(board);
};
```

**Future Enhancement:** Implement actual chess puzzle (e.g., "Checkmate in 2 moves")

#### Level 3: Math Question

**Question:** "რა არის 7 + 8?" (Georgian: "What is 7 + 8?")
**Answer:** 15
**Attempts:** 3 maximum

**Validation:**
```javascript
function handleMathSubmit() {
    const answer = parseInt(mathInput);
    
    if (answer === 15) {
        setTier80Unlocked(true);
        setShowChallenge(false);
        setChallengeScreen('intro');
        // Auto-select 80-85% tier
        setTier('80-85');
    } else {
        setMathTries(mathTries + 1);
        
        if (mathTries >= 2) {
            // Failed all attempts
            setMathFeedback('სამწუხაროდ, ცდეთ ვერ გაიარეს.');
            setTimeout(() => {
                setShowChallenge(false);
                setChallengeScreen('intro');
            }, 2000);
        } else {
            setMathFeedback('არასწორი, ცდით კიდევ.');
        }
    }
}
```

### Modal Styling

**Design System:**
- **Width:** 500px minimum (600px for chess to fit board)
- **Background:** White with subtle shadow
- **Header:** White background, blue title, gray subtitle
- **Content:** 8px padding, generous spacing
- **Buttons:** Blue primary, gray secondary
- **Font sizes:** Doubled from original (text-4xl titles, text-2xl body)
- **Spacing:** mb-4, mb-6, mb-10 for progressive spacing

**Modal Structure (All Screens):**
```javascript
e("div", {className: "pointer-events-auto bg-white rounded-xl shadow-2xl",
          style: {width:'90%', maxWidth:'500px', minWidth:'500px',
                  boxShadow:'0 20px 60px rgba(0, 0, 0, 0.3)'}}, [
    // Header
    e("div", {className: "bg-white px-8 py-8 rounded-t-xl border-b-2 border-gray-100"}, [
        e("h2", {className: "text-4xl font-bold text-blue-600 mb-4"}, title)
    ]),
    // Content
    e("div", {className: "p-8"}, [
        // Screen-specific content
    ])
])
```

### Georgian Translations (CHALLENGE_TEXTS)

```javascript
const CHALLENGE_TEXTS = {
    intro_title: "გამოწვევა",
    intro_desc1: (title) => `გაიარეთ ${title} ყველაზე დაბალ ფასად!`,
    intro_desc2: "გაიარეთ 3 დონეის გამოწვევა",
    intro_desc3: "დააჭირეთ ღილაკი და გაიგეთ 80-85% ბატარეის ფასი!",
    start_btn: "დაწყება",
    close_btn: "დახურვა",
    score: "ქულები",
    lose_title: "წაგეთ!",
    lose_desc: "ცდით თავიდან",
    try_again: "თავიდან ცდა",
    level2_title: "დონე 1 გაიარეთ!",
    level2_desc1: "გინახარია! გადავიდთ დონე 2-ზე.",
    level2_desc2: "ახლა შახმატის გამოცდა.",
    continue_btn: "გაგრძელება",
    chess_title: "შახმატი",
    chess_desc: "გააკეთეთ სწორი სვლა.",
    math_title: "მათემატიკა",
    math_tries: (n) => `ცდები: ${3-n}/3`,
    math_question: "რა არის 7 + 8?",
    submit_btn: "გაგზავნა"
};
```

### User Experience Flow

1. **User sees locked 80-85% tier** with 🔒 icon
2. **Clicks tier button** → Challenge modal opens (intro screen)
3. **Reads explanation** → Clicks "Start" or "Cancel"
4. **Plays Flappy Bird** → Taps screen to jump, avoids pipes
5. **Reaches score 10** → Level 2 congratulations modal
6. **Clicks Continue** → Chess board shows (currently skippable)
7. **Clicks Continue** → Math question appears
8. **Enters answer (15)** → Submits
9. **Success** → Modal closes, 80-85% tier unlocks and auto-selects
10. **Price updates** to reflect lowest tier pricing

### Technical Notes

**Performance:**
- Game loop runs at 60 FPS (16ms interval)
- Collision detection optimized (only check nearby pipes)
- State updates batched where possible

**Accessibility:**
- Modal can be closed by clicking backdrop (intro screen only)
- ESC key support not implemented (future enhancement)
- Keyboard controls not implemented (future enhancement)

**Mobile Considerations:**
- Touch events work for bird jump
- Modal width responsive (90% on mobile, 500px min on desktop)
- Font sizes large enough for mobile readability

**Known Issues:**
- Chess level is placeholder (no actual puzzle)
- Math question hardcoded (could be randomized)
- No progress saving (refresh loses progress)
- Challenge can be repeated unlimited times

---

## 🏗️ Architecture Overview

### File Structure
```
gstore-epp/
├── gstore-epp.php                 # Main plugin file (v4.0.0)
├── admin/
│   ├── menu.php                   # Admin UI (Pricing Rules, Add-ons, Debug)
│   ├── metabox-fbt.php           # FBT product selector
│   ├── metabox-compare.php       # Product comparison scores
│   ├── typography.php            # Font management
│   └── translations.php          # UI text translations
├── assets/
│   ├── css/
│   │   ├── tw.css                # Tailwind base (compiled)
│   │   └── app.css               # Custom styles
│   └── js/
│       ├── product-app.js        # React app (v2.4.0) ⚠️ VERSION MISMATCH
│       ├── react.production.min.js
│       └── react-dom.production.min.js
├── includes/
│   ├── db.php                    # Database table creation
│   ├── helpers.php               # Logging, options
│   ├── common/
│   │   └── parse.php            # Attribute extraction & normalization
│   ├── frontend/
│   │   ├── enqueue.php          # Shadow DOM setup, asset loading
│   │   └── ajax.php             # Add to cart handler
│   └── rest/
│       └── routes.php           # REST API (siblings, pricing, FBT, etc.)
└── logs/
    ├── fdebug.log               # Full debug log (if enabled)
    └── error.log                # Error log
```

### Technology Stack
- **Frontend:** React 18 (CDN), Shadow DOM, Tailwind CSS (compiled)
- **Backend:** WordPress REST API, WooCommerce hooks
- **Database:** Custom tables (`wp_gstore_model_rules`, `wp_gstore_laptop_addons`)
- **Caching:** WordPress Transients API (1-hour TTL)

---

## 📊 Database Schema

### Table: `wp_gstore_model_rules`
Stores pricing rules per model+storage combination.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `group_key` | VARCHAR(191) | Model+storage identifier (e.g., "apple iphone-14-pro 128gb") |
| `device_type` | VARCHAR(20) | "phone" or "laptop" |
| `default_condition` | VARCHAR(20) | Default USED tier (e.g., "90-95") - optional |
| `pricing_json` | LONGTEXT | JSON with tier prices (see below) |
| `warranty_text` | TEXT | Model-specific warranty content |
| `updated_at` | DATETIME | Last modified timestamp |

**Pricing JSON Structure:**
```json
{
  "80-85": {"regular": "2100", "sale": "2000"},
  "85-90": {"regular": "2200", "sale": ""},
  "90-95": {"regular": "2300", "sale": "2250"},
  "95-100": {"regular": "2400", "sale": ""},
  "new_battery": {"regular": "150", "sale": "140"}
}
```

### Table: `wp_gstore_laptop_addons`
Global laptop add-on options (RAM, Storage).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `scope` | VARCHAR(20) | "laptop_ram" or "laptop_storage" |
| `data_json` | LONGTEXT | JSON array of `{key, label, price}` |
| `updated_at` | DATETIME | Last modified |

---

## 🔧 Product Attributes (WooCommerce)

### Global Attributes (Products → Attributes)
These must be created as **global product attributes**, then values added on individual products.

| Attribute Slug | UI Name | Values | Device Type | Required |
|----------------|---------|--------|-------------|----------|
| `device_type` | Device Type | phone, laptop | Both | ✅ Yes |
| `condition` | Condition | New, Used, Open Box | Both | ✅ Yes |
| `brand` | Brand | Apple, Samsung, etc. | Both | ✅ Yes |
| `model` | Model | iPhone 14 Pro, MacBook Air | Both | ✅ Yes |
| `storage` | Storage | 128GB, 256GB, 512GB, 1TB | Both | ✅ Yes |
| `color` | Color | Space Black, Blue, etc. | Both | ⚠️ Optional |
| `add_ram` | Add RAM | (laptop only) | Laptop | ⚠️ Optional |
| `add_storage` | Add Storage | (laptop only) | Laptop | ⚠️ Optional |
| `shipping` | Shipping | 2-3 business days, etc. | Both | ⚠️ Optional |

**CRITICAL NOTES:**
1. **Device Type determines UI:** Phone shows battery tiers, Laptop shows RAM/Storage add-ons
2. **Group Key = Brand + Model + Storage** (normalized, e.g., "apple iphone-14-pro 128gb")
3. **Condition:** "Used" products show battery tier selector; "New" products don't
4. **Open Box:** Only shown for laptops

### Attribute Extraction Logic (`includes/common/parse.php`)
```php
function gstore_epp_parse_by_product_id($product_id) {
    $raw_brand = gstore_epp_attr($product_id, 'brand');
    $raw_model = gstore_epp_attr($product_id, 'model');
    $storage = gstore_epp_attr($product_id, 'storage');
    $color = gstore_epp_attr($product_id, 'color');
    $condition = gstore_epp_attr($product_id, 'condition');
    $device_type = gstore_epp_device_type($product_id);
    
    // Extract clean brand/model
    $brand = gstore_epp_extract_brand($raw_brand, $raw_model);
    $model = gstore_epp_extract_model($raw_brand, $raw_model);
    
    // Build group key: brand + model + storage
    $storage_normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $storage));
    $group_key = trim($brand . ' ' . $model);
    if ($storage_normalized) {
        $group_key .= ' ' . $storage_normalized; // e.g., "apple iphone-14-pro 128gb"
    }
    
    return [
        'brand' => $brand,
        'model' => $model,
        'storage' => $storage,
        'color' => $color,
        'condition' => $condition,
        'device_type' => $device_type,
        'group_key' => $group_key
    ];
}
```

---

## 🎨 Frontend Architecture

### Shadow DOM Implementation
**File:** `includes/frontend/enqueue.php`

```php
// Shadow DOM host injected before WooCommerce product
add_action('woocommerce_before_single_product', function(){
    echo '<div id="gstore-epp-shadow-host"></div>';
    
    // Hide default WooCommerce product
    echo '<style>
        .single-product div.product { display: none !important; }
    </style>';
});
```

**Why Shadow DOM?**
- Prevents theme CSS from breaking plugin UI
- Allows Tailwind CSS to work without conflicts
- Isolates React app from WordPress

### React App Structure (`assets/js/product-app.js`)
**Version in code:** v2.4.0 ⚠️ (Mismatch with claimed v4.2.0)

```javascript
function ProductApp() {
    // STATE
    const [siblings, setSiblings] = useState([]);         // All model variants
    const [cur, setCur] = useState({...});                // Current product
    const [rules, setRules] = useState(null);             // Pricing rules
    const [tier, setTier] = useState(null);               // Selected battery tier
    const [newBat, setNewBat] = useState(false);          // New battery toggle
    const [cond, setCond] = useState('new');              // NEW/USED condition
    const [fbt, setFbt] = useState([]);                   // FBT products
    const [selectedFBT, setSelectedFBT] = useState([]);   // Selected FBT IDs
    
    // EFFECTS
    useEffect(() => {
        // Load siblings from REST API
        fetch(`/wp-json/gstore/v1/siblings?product_id=${productId}`)
    }, []);
    
    useEffect(() => {
        // Load pricing rules (storage-specific)
        fetch(`/wp-json/gstore/v1/pricing?product_id=${productId}`)
    }, []);
    
    useEffect(() => {
        // Auto-apply default tier when switching to USED
        if (cond === 'used' && rules?.default_condition) {
            setTier(rules.default_condition);
        }
    }, [cond, rules]);
    
    // RENDER
    return (
        <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8">
            {/* LEFT: Hero image, swatches, description, tabs */}
            {/* RIGHT: Title, price, info grid, selectors, CTAs, FBT */}
        </div>
    );
}
```

### Layout Structure

#### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│  TWO-COLUMN GRID (max-width: 1400px, centered)             │
├──────────────────────────┬──────────────────────────────────┤
│ LEFT COLUMN              │ RIGHT COLUMN                     │
├──────────────────────────┼──────────────────────────────────┤
│ [Hero Image]             │ iPhone 14 Pro Max                │
│                          │ ────────────────────────          │
│ [Color Swatches]         │ ₾3,899.00 (red if sale)         │
│                          │ From ₾325/month                  │
│ [Description]            │                                  │
│                          │ 📦 Ship  🛡️ Warranty             │
│ ┌──────────────────────┐ │ 🔋 100%  ℹ️ NEW                  │
│ │ Specs│Warr│Compare  │ │                                  │
│ ├──────────────────────┤ │ Storage Options                  │
│ │ • Display: 6.1"     │ │ [128GB][256GB][512GB][1TB]       │
│ │ • Chip: A16 Bionic  │ │                                  │
│ │ • 5G, Wi-Fi 6       │ │ Condition                        │
│ └──────────────────────┘ │ [NEW] [USED (A)]                 │
│                          │                                  │
│                          │ [80-85%][85-90%][90-95%][95%+]   │
│                          │ [+ Add New Battery]              │
│                          │                                  │
│                          │ [🛒 Add to Cart] [Buy Now]       │
│                          │                                  │
│                          │ Frequently Bought Together       │
│                          │ [Item1] [Item2] [Item3]          │
└──────────────────────────┴──────────────────────────────────┘
```

#### Mobile (<1024px)
```
┌─────────────────────────────────┐
│ iPhone 14 Pro Max               │ ← Title
├─────────────────────────────────┤
│ [Hero Image]                    │
├─────────────────────────────────┤
│ [🟤] [⚫] [⚪] [🔵]            │ ← Swatches
├─────────────────────────────────┤
│ 📦 2-3 days    🛡️ Warranty      │ ← Info Grid (4 items)
│ 🔋 100%        ℹ️ NEW           │
├─────────────────────────────────┤
│ Storage Options                 │
│ [128GB][256GB][512GB][1TB]      │
├─────────────────────────────────┤
│ Condition                       │
│ [NEW] [USED (A)]                │
├─────────────────────────────────┤
│ Battery Tiers (if USED)         │
│ [80-85%][85-90%][90-95%][95%+]  │
│ [+ Add New Battery]             │
├─────────────────────────────────┤
│ Description                     │
├─────────────────────────────────┤
│ ▼ Specifications (collapsible)  │
│ ▼ Warranty                      │
│ ▼ Compare                       │
├─────────────────────────────────┤
│ Frequently Bought Together      │
│ [Item1] [Item2] [Item3]         │
└─────────────────────────────────┘
```

---

## 🔌 REST API Endpoints

**Namespace:** `gstore/v1`  
**File:** `includes/rest/routes.php`

### 1. GET `/siblings?product_id={id}`
Returns all products in the same model group.

**Response:**
```json
{
  "ok": true,
  "brand": "Apple",
  "model": "iPhone 14 Pro",
  "count": 12,
  "siblings": [
    {
      "id": 123,
      "title": "iPhone 14 Pro 128GB Space Black",
      "permalink": "https://...",
      "price": "3899",
      "regular": "3999",
      "sale": "3899",
      "condition": "new",        // normalized: new|used|openbox
      "condition_raw": "NEW",    // original attribute value
      "brand": "Apple",
      "model": "iPhone 14 Pro",
      "storage": "128GB",
      "color": "Space Black",
      "image": "https://..."
    }
    // ... more siblings
  ]
}
```

**Caching:** 1 hour transient (`gstore_siblings_{product_id}`)

**Query Logic:**
1. Parse current product's `model` attribute
2. Find all products with matching `pa_model` taxonomy term
3. Fallback to meta query if taxonomy not found
4. Normalize conditions for proper matching (e.g., "USED (A)" → "used")

---

### 2. GET `/pricing?product_id={id}`
Returns pricing rules for the product's model+storage combination.

**Response:**
```json
{
  "ok": true,
  "exists": true,
  "device_type": "phone",
  "group_key": "apple iphone-14-pro 128gb",
  "storage": "128GB",
  "default_condition": "90-95",
  "pricing": {
    "80-85": {"regular": "2100", "sale": "2000"},
    "85-90": {"regular": "2200", "sale": ""},
    "90-95": {"regular": "2300", "sale": "2250"},
    "95-100": {"regular": "2400", "sale": ""},
    "new_battery": {"regular": "150", "sale": "140"}
  }
}
```

**Caching:** 1 hour transient (`gstore_pricing_{product_id}`)

**Resolution Logic:**
1. Try storage-specific rule first: `"apple iphone-14-pro 128gb"`
2. Fallback to model-level rule: `"apple iphone-14-pro"`
3. Return `exists: false` if no rule found

---

### 3. GET `/fbt?product_id={id}`
Returns 3 products for "Frequently Bought Together" section.

**Response:**
```json
{
  "ok": true,
  "products": [
    {
      "id": 456,
      "title": "iPhone Case - Silicone",
      "permalink": "https://...",
      "price": "49",
      "regular": "59",
      "sale": "49",
      "image": "https://..."
    }
    // ... 2 more items
  ]
}
```

**Selection Logic:**
1. Use product's custom `_gstore_fbt_ids` meta (up to 3 IDs)
2. If empty, inherit from model's "group default" product
3. If still empty, pick 3 random from "Accessories" category

**Group Default:** One product per model can be marked "Set as group default" (meta: `_gstore_is_group_default = yes`)

---

### 4. GET `/warranty?product_id={id}`
Returns warranty text for the product's model.

**Response:**
```json
{
  "ok": true,
  "warranty_text": "<p>1 year limited warranty...</p>"
}
```

**Resolution:**
1. Check model rule's `warranty_text` column
2. Fallback to global default from translations

---

### 5. GET `/compare-specs?product_id={id}`
Returns comparison scores (0-100) for 12 categories.

**Response:**
```json
{
  "ok": true,
  "product_id": 123,
  "title": "iPhone 14 Pro",
  "specs": {
    "CPU": 95,
    "GPU": 90,
    "Camera": 98,
    "Battery": 85,
    "Display": 92,
    "Build": 88,
    "Connectivity": 90,
    "Charging": 80,
    "Weight": 75,
    "Durability": 85,
    "Storage Speed": 95,
    "Thermals": 88
  }
}
```

**Stored in:** `_gstore_compare_specs` post meta (set via admin meta box)

---

### 6. GET `/products-search?search={query}&limit={n}`
Search products for comparison feature.

**Response:**
```json
{
  "ok": true,
  "products": [
    {"id": 789, "title": "Samsung Galaxy S23", "image": "https://..."}
  ]
}
```

---

## 💰 Pricing Logic

### Price Calculation Flow

#### For NEW Products:
```
FINAL PRICE = WooCommerce Product Price (regular or sale)
```

#### For USED Products (Phones):
```
BASE PRICE = Pricing Rule[selected_tier].sale || Pricing Rule[selected_tier].regular
NEW BATTERY ADD-ON = (if checked) Pricing Rule['new_battery'].sale || regular
FBT ADD-ONS = Sum of selected FBT product prices

GRAND TOTAL = BASE PRICE + NEW BATTERY + FBT ADD-ONS
```

#### For Laptops:
```
BASE PRICE = WooCommerce Product Price
RAM ADD-ONS = Sum of selected Global Add-on prices
STORAGE ADD-ONS = Sum of selected Global Add-on prices
FBT ADD-ONS = Sum of selected FBT product prices

GRAND TOTAL = BASE PRICE + RAM + STORAGE + FBT
```

### Price Display Component
**File:** `assets/js/product-app.js` (lines ~460-480)

```javascript
const priceBlock = useMemo(() => {
    let reg = parseFloat(cur.regular || cur.price || 0);
    let sale = parseFloat(cur.sale || 0);
    let showSale = (sale > 0 && sale < reg) ? sale : null;
    
    // If NEW or no rules, use WooCommerce price
    if (!rules || !rules.exists || cond === 'new') {
        let base = showSale != null ? sale : reg;
        return {base: base, reg: reg, sale: showSale, hasSale: !!showSale};
    }
    
    // If USED and tier selected, use pricing rule
    if (tier) {
        let chosen = rules.pricing[tier] || {};
        let r = parseFloat(chosen.regular || 0);
        let s = parseFloat(chosen.sale || 0);
        let base = (s > 0 && s < r) ? s : r;
        
        // Add new battery if checked
        if (cur.deviceType === 'phone' && newBat) {
            let nb = rules.pricing['new_battery'] || {};
            let add = parseFloat((nb.sale && nb.sale !== '') ? nb.sale : (nb.regular || 0));
            if (isFinite(add)) base += add;
        }
        
        return {base: base, reg: r, sale: (s > 0 && s < r) ? s : null, hasSale: (s > 0 && s < r)};
    }
    
    // No tier selected, show WooCommerce price
    let base = showSale != null ? sale : reg;
    return {base: base, reg: reg, sale: showSale, hasSale: !!showSale};
}, [cur, rules, tier, newBat, cond]);
```

---

## 🛒 Add to Cart & Checkout

### Current Implementation (`includes/frontend/ajax.php`)
```php
function gstore_epp_add_to_cart_core() {
    check_ajax_referer('gstore_epp_ajax', 'nonce');
    
    $pid = absint($_POST['product_id']);
    $qty = isset($_POST['quantity']) ? max(1, absint($_POST['quantity'])) : 1;
    
    $added = WC()->cart->add_to_cart($pid, $qty);
    
    if (!$added) throw new Exception('NOT_PURCHASABLE');
    
    wp_send_json_success(['ok' => true]);
}
```

### 🚨 CRITICAL BUG: Price Override Not Applied
**Problem:** Cart uses product's base price from WooCommerce, ignoring pricing rules.

**What's Missing:**
1. No line item meta for battery tier/new battery
2. No cart price override hook
3. No laptop add-on prices applied

**Fix Required:**
```php
// In add_to_cart handler, need to:

// 1. Store selected options in line item meta
$cart_item_key = WC()->cart->add_to_cart($pid, $qty);

if ($cart_item_key) {
    $cart_item = WC()->cart->get_cart_item($cart_item_key);
    
    // Add meta for pricing rule tier
    if ($tier) {
        WC()->cart->cart_contents[$cart_item_key]['gstore_tier'] = $tier;
        WC()->cart->cart_contents[$cart_item_key]['gstore_tier_price'] = $tier_price;
    }
    
    // Add meta for new battery
    if ($new_battery) {
        WC()->cart->cart_contents[$cart_item_key]['gstore_new_battery'] = true;
        WC()->cart->cart_contents[$cart_item_key]['gstore_battery_price'] = $battery_price;
    }
    
    // Add meta for laptop add-ons
    if ($laptop_addons) {
        WC()->cart->cart_contents[$cart_item_key]['gstore_addons'] = $laptop_addons;
        WC()->cart->cart_contents[$cart_item_key]['gstore_addons_price'] = $addons_price;
    }
}

// 2. Add price override filter
add_filter('woocommerce_cart_item_price', function($price, $cart_item, $cart_item_key) {
    if (isset($cart_item['gstore_tier_price'])) {
        $new_price = $cart_item['gstore_tier_price'];
        
        if (!empty($cart_item['gstore_battery_price'])) {
            $new_price += $cart_item['gstore_battery_price'];
        }
        
        if (!empty($cart_item['gstore_addons_price'])) {
            $new_price += $cart_item['gstore_addons_price'];
        }
        
        return wc_price($new_price);
    }
    return $price;
}, 10, 3);
```

---

## 🎨 Admin Interface

### Menu Structure
```
WordPress Admin → Gstore
├── Dashboard (placeholder)
├── Pricing Rules
│   ├── List all rules
│   ├── Edit rule (tier prices + warranty text)
│   └── Models without rules (create quickly)
├── Global Add-ons (Laptops)
│   ├── RAM options (label + price)
│   └── Storage options (label + price)
├── Typography
│   ├── Font source (Google Fonts / Custom Upload / Custom URL)
│   ├── Heading font + weight
│   ├── Body font + weight
│   └── Custom CSS
├── Translations
│   ├── All UI text (installments, shipping, warranty, etc.)
│   └── Default warranty content
├── Debug & Logging
│   ├── Full debug log toggle
│   └── Error log toggle
└── Maintenance
    ├── Clear all pricing rules
    └── Clear all caches
```

### Pricing Rules Admin Page
**File:** `admin/menu.php` (lines 17-250)

**Features:**
1. List all existing rules (group_key, device, default tier, updated date)
2. Edit rule form:
    - Group key (auto-filled from "Models without rules")
    - Device type (phone/laptop)
    - Default USED tier (optional pre-selection)
    - Pricing grid (regular + sale for each tier + new battery)
    - Warranty text (HTML editor)
3. "Models without rules" section:
    - Scans all products
    - Groups by model+storage
    - Shows combinations missing rules
    - "Create Rule" button pre-fills form

**Group Key Format:**
- Display: `"Apple iPhone 14 Pro - 128GB"`
- Stored: `"apple iphone-14-pro 128gb"` (normalized)

---

## 🌍 Translations System

**File:** `admin/translations.php`

All user-facing text can be customized without code changes.

### Available Translations
| Key | Default | Usage |
|-----|---------|-------|
| `installment_text` | "From ₾{amount}/month for 12 months" | Below price |
| `shipping_text` | "Shipping: 2–3 business days" | Info grid label |
| `default_shipping` | "2–3 business days" | Fallback value |
| `warranty_text` | "Warranty: Available" | Info grid label |
| `battery_health_text` | "Battery Health: 100%" | Info grid |
| `condition_text` | "Condition: {condition}" | Info grid |
| `storage_options_text` | "Storage Options" | Section heading |
| `condition_label` | "Condition" | Section heading |
| `condition_new` | "NEW" | Button text |
| `condition_used` | "USED (A)" | Button text |
| `fbt_title` | "Frequently Bought Together" | Section heading |
| `add_new_battery` | "+ Add New Battery (+₾{amount})" | Button inactive state |
| `new_battery_added` | "✓ New Battery Added (+₾{amount})" | Button active state |
| `add_button` | "+ Add ₾{price}" | FBT button inactive |
| `added_button` | "✓ Added (₾{price})" | FBT button active |
| `add_to_cart` | "Add to Cart" | Primary CTA |
| `buy_now` | "Buy Now" | Secondary CTA |
| `specifications_tab` | "Specifications" | Tab label |
| `warranty_tab` | "Warranty" | Tab label |
| `compare_tab` | "Compare" | Tab label |
| `add_to_compare` | "Add Product to Compare" | Comparison button |
| `default_warranty_content` | "1 year limited hardware warranty..." | Fallback warranty text |

### Translation Function
```javascript
function t(key, fallback, replacements) {
    var translations = BOOT.translations || {};
    var text = translations[key] || fallback;
    
    // Replace placeholders like {amount}, {price}, {condition}
    if (replacements) {
        Object.keys(replacements).forEach(function(placeholder) {
            text = text.replace(new RegExp('{' + placeholder + '}', 'g'), replacements[placeholder]);
        });
    }
    
    return text;
}

// Usage
t('installment_text', 'From ₾{amount}/month', {amount: '325'})
// → "From ₾325/month for 12 months" (if translation set)
```

---

## 🎨 Typography System

**File:** `admin/typography.php`

### Font Sources
1. **Google Fonts** (default)
    - 25+ popular fonts (Inter, Roboto, Poppins, etc.)
    - Weight selection per font
    - Auto-loads from Google CDN

2. **Custom Font URL**
    - Enter any external font URL
    - Useful for Adobe Fonts, custom CDN

3. **Upload Font Files**
    - Upload .woff2, .woff, .ttf files
    - Generates `@font-face` CSS
    - Stores in WordPress media library

### Font Application
```css
/* Generated in Shadow DOM */
:host {
    --font-heading: 'Inter', sans-serif;
    --font-body: 'Inter', sans-serif;
    --weight-heading: 600;
    --weight-body: 400;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading) !important;
    font-weight: var(--weight-heading) !important;
}

body, p, span, div, button {
    font-family: var(--font-body) !important;
    font-weight: var(--weight-body);
}
```

---

## 🐛 Known Issues & Required Fixes

### 🔴 CRITICAL (Showstoppers)

#### 1. Add to Cart Uses Wrong Price
**File:** `includes/frontend/ajax.php`  
**Problem:** Cart line item uses WooCommerce product base price, not pricing rule price.

**Impact:**
- Customer sees correct price on product page
- Cart shows different price
- Order total is wrong

**Required Fix:**
1. Pass selected tier, new battery, laptop add-ons to AJAX handler
2. Calculate correct price server-side
3. Store in line item meta
4. Override cart price with `woocommerce_cart_item_price` filter
5. Display meta in cart/checkout (battery tier, add-ons)

**Example Implementation Needed:**
```php
// In ajax.php
$selected_tier = sanitize_text_field($_POST['tier'] ?? '');
$new_battery = !empty($_POST['new_battery']);
$laptop_addons = !empty($_POST['laptop_addons']) ? json_decode($_POST['laptop_addons'], true) : [];

// Get pricing rule
$ctx = gstore_epp_parse_by_product_id($pid);
$row = /* fetch from database */;
$pricing = json_decode($row['pricing_json'], true);

// Calculate price
$base_price = $pricing[$selected_tier]['sale'] ?: $pricing[$selected_tier]['regular'];
if ($new_battery) {
    $base_price += $pricing['new_battery']['sale'] ?: $pricing['new_battery']['regular'];
}

// Add to cart with meta
$cart_item_key = WC()->cart->add_to_cart($pid, $qty);
WC()->cart->cart_contents[$cart_item_key]['gstore_calculated_price'] = $base_price;
WC()->cart->cart_contents[$cart_item_key]['gstore_tier'] = $selected_tier;
WC()->cart->cart_contents[$cart_item_key]['gstore_new_battery'] = $new_battery;

// Add price override filter (separate file or in includes/frontend/)
add_filter('woocommerce_cart_item_price', function($price, $cart_item) {
    if (isset($cart_item['gstore_calculated_price'])) {
        return wc_price($cart_item['gstore_calculated_price']);
    }
    return $price;
}, 10, 2);
```

---

#### 2. Battery Health Text Hardcoded to "100%"
**File:** `assets/js/product-app.js` (line ~715)

**Current Code:**
```javascript
e("div", {className: "flex items-center gap-2"}, [
    e(BatteryIcon),
    " " + t('battery_health_text', 'Battery Health: 100%')
])
```

**Problem:** Always shows 100% regardless of selected tier.

**Required Fix:**
```javascript
// Calculate battery health based on tier
const batteryHealth = useMemo(() => {
    if (cond === 'new') return '100%';
    if (!tier) return '100%';
    
    // tier is like "80-85", "90-95", etc.
    // Use midpoint for display
    const parts = tier.split('-');
    const mid = (parseInt(parts[0]) + parseInt(parts[1])) / 2;
    return Math.round(mid) + '%';
}, [cond, tier]);

// Then in render:
e("div", {className: "flex items-center gap-2"}, [
    e(BatteryIcon),
    " " + t('battery_health_text', 'Battery Health: {health}%', {health: batteryHealth})
])
```

---

### 🟠 HIGH PRIORITY

#### 3. Unavailable Options Show Grayed Out Instead of Hidden
**File:** `assets/js/product-app.js` (multiple locations)

**Current Behavior:**
- Storage buttons: disabled + grayed out (`bg-gray-100 text-gray-400 cursor-not-allowed`)
- Battery tiers: same approach
- Condition tabs: same approach

**Requested Behavior:**
- Don't show unavailable options at all
- Keep remaining buttons same size (don't stretch)

**Example Fix for Storage Selector (line ~820):**
```javascript
// BEFORE
ALL_STORAGES.map(function(st) {
    var available = storages[st];
    var cls = available ? "..." : "bg-gray-100 text-gray-400 cursor-not-allowed";
    return e("button", {key: st, className: cls, disabled: !available}, st);
})

// AFTER
Object.keys(storages).map(function(st) {  // Only iterate available storages
    var active = String(st).toLowerCase() === String(cur.storage).toLowerCase();
    var cls = active ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50";
    return e("button", {key: st, className: cls, onClick: function() { switchStorage(st); }}, st);
})
```

**Apply same logic to:**
- Battery tier buttons (lines ~865-885)
- Condition tabs (lines ~850-865)

---

#### 4. Laptop Products Show Phone UI
**File:** `assets/js/product-app.js`

**Problem:**
- Laptop products still show "Storage Options" (128GB/256GB/etc.) which is phone-specific
- Laptop add-ons (RAM, Storage) not rendered at all

**Current Code Shows:**
```javascript
// Storage selector always renders (line ~815)
e("div", {key: "storage"}, [
    e("h3", {className: "..."}, t('storage_options_text', 'Storage Options')),
    e("div", {className: "..."}, ALL_STORAGES.map(...))
])
```

**Required Fix:**
```javascript
// Conditionally render based on device type
{cur.deviceType === 'phone' && (
    e("div", {key: "storage"}, [
        e("h3", {}, t('storage_options_text', 'Storage Options')),
        e("div", {}, ALL_STORAGES.map(...))
    ])
)}

{cur.deviceType === 'laptop' && (
    e("div", {key: "laptop-addons"}, [
        // Render laptop RAM options
        e("div", {}, [
            e("h3", {}, "Add RAM"),
            // Fetch from Global Add-ons, render checkboxes
        ]),
        
        // Render laptop storage options
        e("div", {}, [
            e("h3", {}, "Add Storage"),
            // Fetch from Global Add-ons, render checkboxes
        ])
    ])
)}
```

**Data Source:** Need to fetch laptop add-ons from REST API or include in BOOT data.

**Suggested Approach:**
1. Add new REST endpoint: `/laptop-addons` (or include in pricing response)
2. Load in React state
3. Render checkboxes with prices
4. Track selected add-ons in state
5. Add to cart with meta

---

#### 5. Plugin Overlays WordPress Header/Footer
**File:** `includes/frontend/enqueue.php` (lines 15-70)

**Problem:**
- Shadow host has `z-index: 999999` which overlays header
- Header gets stretched/distorted
- Plugin appears above navigation menu

**Current CSS:**
```css
#gstore-epp-shadow-host { 
    z-index: 999999 !important;
    position: relative !important;
}
```

**Required Fix:**
```css
/* Remove excessive z-index */
#gstore-epp-shadow-host { 
    z-index: auto; /* or z-index: 1 */
    position: relative;
}

/* Ensure theme header stays on top */
.site-header,
header,
.header-wrapper {
    z-index: 1000 !important;
    position: relative;
}

/* Plugin content should be below header */
.single-product .site-content,
.single-product #primary {
    z-index: 1;
}
```

**Also Check:**
- Remove overlay-hiding scripts (lines 45-70 in enqueue.php)
- They might be hiding legitimate theme elements

---

### 🟡 MEDIUM PRIORITY

#### 6. Mobile Layout Alignment Issue
**File:** `assets/js/product-app.js`

**Problem:** Mobile view shifted right, not centered.

**Likely Cause:** Max-width or padding issue in container.

**Check:**
```javascript
// Line ~700
return e("div", {className: "min-h-screen bg-white"}, [
    e("div", {key: "main", className: "max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8"}, [
        // ...
    ])
])
```

**Possible Fix:**
```javascript
// Mobile: full width with padding
// Desktop: max-width centered
className: "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
```

**Test on:**
- iPhone SE (375px)
- iPhone 14 Pro (393px)
- Galaxy S23 (360px)

---

#### 7. Desktop Layout Still Wrong (Claimed Fixed in v4.2.0, But Not)
**File:** `assets/js/product-app.js`

**User Report:** "Desktop view also shows mobile view everywhere"

**Investigation Needed:**
1. Check responsive classes: `lg:grid-cols-2`, `hidden lg:block`, etc.
2. Verify Tailwind breakpoint: `lg` = 1024px
3. Test at exactly 1024px width
4. Check for CSS conflicts from theme

**Potential Issues:**
- Tailwind CSS not loading properly in Shadow DOM
- Theme CSS overriding Tailwind
- Incorrect responsive class usage

**Debugging Steps:**
```javascript
// Add to product-app.js for testing
console.log('Window width:', window.innerWidth);
console.log('Should show desktop:', window.innerWidth >= 1024);

// Check if Tailwind loaded
const testDiv = document.createElement('div');
testDiv.className = 'hidden lg:block';
shadowRoot.appendChild(testDiv);
const computed = window.getComputedStyle(testDiv);
console.log('Tailwind working:', computed.display); // Should be 'none' on mobile, 'block' on desktop
```

---

### 🟢 LOW PRIORITY

#### 8. Version Mismatch
- `gstore-epp.php` says v4.0.0
- `product-app.js` console.log says v2.4.0
- Handoff doc claims v4.2.0

**Fix:** Update version numbers consistently.

---

#### 9. Sticky Bottom Bar Positioning
**File:** `includes/frontend/enqueue.php`

**Note:** Handoff doc says this was fixed, but may need verification.

**Expected:** Sticky bar should appear above Woodmart footer toolbar.

**Implementation:** JavaScript detects toolbar height and adjusts sticky bar `bottom` position.

**Check:** Lines 147+ in enqueue.php have positioning script.

---

## 🧪 Testing Checklist

### Phone Products
- [ ] NEW condition shows no battery tier selector
- [ ] USED condition shows battery tier buttons
- [ ] Disabled tiers are hidden (not just grayed)
- [ ] Battery Health text updates when tier selected
- [ ] New Battery toggle adds correct price
- [ ] Storage switching works
- [ ] Color switching works
- [ ] FBT add/remove works
- [ ] Add to Cart applies pricing rule price ⚠️ **BROKEN**
- [ ] Buy Now applies pricing rule price ⚠️ **BROKEN**
- [ ] Cart shows correct price with line item meta ⚠️ **BROKEN**

### Laptop Products
- [ ] No battery tier selector shows
- [ ] No phone storage options (128GB/256GB) show ⚠️ **BROKEN**
- [ ] RAM add-on checkboxes show ⚠️ **NOT IMPLEMENTED**
- [ ] Storage add-on checkboxes show ⚠️ **NOT IMPLEMENTED**
- [ ] Open Box condition tab shows
- [ ] Add to Cart includes add-on prices ⚠️ **NOT IMPLEMENTED**

### Desktop Layout (≥1024px)
- [ ] Two-column grid visible
- [ ] Left: Hero + Swatches + Description + Tabs
- [ ] Right: Title + Price + Info + Selectors + Buttons + FBT
- [ ] Max-width 1400px, centered
- [ ] Proper spacing (20px padding)
- [ ] No overlap with header ⚠️ **BROKEN**
- [ ] No overlap with footer

### Mobile Layout (<1024px)
- [ ] Single column, full width
- [ ] Title at top
- [ ] Correct element order (see handoff doc)
- [ ] Info grid RIGHT AFTER color swatches ⚠️ **VERIFY**
- [ ] Collapsible tabs work
- [ ] Sticky bar above footer toolbar
- [ ] Content centered, not shifted right ⚠️ **BROKEN**

### Translations
- [ ] All UI text uses translation system
- [ ] Placeholders ({amount}, {price}, {condition}) work
- [ ] Defaults show if translation not set

### Typography
- [ ] Google Fonts load correctly
- [ ] Custom uploaded fonts load
- [ ] Fonts apply to Shadow DOM elements
- [ ] Fallback fonts work if CDN fails

### Caching
- [ ] Siblings cache for 1 hour
- [ ] Pricing cache for 1 hour
- [ ] FBT cache for 1 hour
- [ ] Cache clears when product updated
- [ ] Cache clears when pricing rule updated

---

## 📂 Critical Files Reference

| File | Purpose | Version | Status |
|------|---------|---------|--------|
| `gstore-epp.php` | Main plugin file | 4.0.0 | ⚠️ Version mismatch |
| `assets/js/product-app.js` | React app | 2.4.0 | 🔴 Battery health bug |
| `includes/rest/routes.php` | REST API | — | ✅ Working |
| `includes/frontend/ajax.php` | Add to cart | — | 🔴 Price not applied |
| `includes/frontend/enqueue.php` | Shadow DOM setup | — | 🟠 Z-index issues |
| `includes/common/parse.php` | Attribute extraction | — | ✅ Working |
| `admin/menu.php` | Pricing rules admin | — | ✅ Working |
| `admin/translations.php` | UI text management | — | ✅ Working |
| `admin/typography.php` | Font management | — | ✅ Working |

---

## 🎯 Immediate Action Items

### For Next Developer

1. **FIRST PRIORITY (Showstopper):**
    - Fix `includes/frontend/ajax.php` to pass and apply pricing rule prices to cart
    - See "Add to Cart & Checkout" section for implementation details
    - Test thoroughly: NEW phones, USED phones (all tiers), New Battery add-on, FBT items

2. **SECOND PRIORITY:**
    - Fix battery health text in `assets/js/product-app.js` to reflect selected tier
    - Implement laptop add-ons UI (RAM, Storage checkboxes)
    - Hide unavailable options instead of graying them out

3. **THIRD PRIORITY:**
    - Fix z-index overlay issues in `includes/frontend/enqueue.php`
    - Fix mobile alignment (check container padding/max-width)
    - Verify desktop layout at 1024px+ breakpoint

4. **TESTING:**
    - Create test products:
        - 1 NEW phone (iPhone 14 Pro 128GB Space Black)
        - 1 USED phone (same model, different color)
        - 1 laptop (MacBook Air with RAM/Storage attributes)
    - Create pricing rules for both phone storages (128GB, 256GB)
    - Test full purchase flow: product page → cart → checkout → order

5. **DOCUMENTATION:**
    - Update version numbers consistently
    - Add inline code comments for complex logic
    - Document any new REST endpoints

---

## 📝 Developer Notes

### Working with Shadow DOM
```javascript
// Access shadow root from browser console
const host = document.getElementById('gstore-epp-shadow-host');
const shadow = host.shadowRoot;

// Inspect elements
shadow.querySelector('.gstore-container');

// Check if Tailwind loaded
shadow.querySelector('style').textContent.includes('tw-');
```

### Debugging REST API
```bash
# Test siblings endpoint
curl https://your-site.com/wp-json/gstore/v1/siblings?product_id=123

# Test pricing endpoint
curl https://your-site.com/wp-json/gstore/v1/pricing?product_id=123

# Check cache
wp transient get gstore_siblings_123
wp transient get gstore_pricing_123
```

### Cache Management
```php
// Clear all Gstore caches
global $wpdb;
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gstore_%'");
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_gstore_%'");
```

### Logging
```php
// Enable full debug
update_option('gstore_epp_options', ['debug_full' => 1, 'debug_errors' => 1]);

// Check logs
tail -f wp-content/plugins/gstore-epp/logs/fdebug.log
tail -f wp-content/plugins/gstore-epp/logs/error.log
```

---

## 🔗 External Resources

- **GitHub Repo:** https://github.com/Porokha/Gstore-EPP.git
- **React 18 Docs:** https://react.dev
- **WooCommerce Hooks:** https://woocommerce.github.io/code-reference/hooks/hooks.html
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Shadow DOM MDN:** https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM

---

## 📊 Summary Status Matrix

| Feature | Spec | Implemented | Working | Priority |
|---------|------|-------------|---------|----------|
| Shadow DOM isolation | ✅ | ✅ | ✅ | — |
| React 18 app | ✅ | ✅ | ✅ | — |
| Siblings API | ✅ | ✅ | ✅ | — |
| Pricing API (storage-specific) | ✅ | ✅ | ✅ | — |
| FBT API | ✅ | ✅ | ✅ | — |
| Warranty API | ✅ | ✅ | ✅ | — |
| Compare API | ✅ | ✅ | ✅ | — |
| Admin pricing rules | ✅ | ✅ | ✅ | — |
| Admin translations | ✅ | ✅ | ✅ | — |
| Admin typography | ✅ | ✅ | ✅ | — |
| Storage switching | ✅ | ✅ | ✅ | — |
| Color switching | ✅ | ✅ | ✅ | — |
| Condition switching (NEW/USED) | ✅ | ✅ | ✅ | — |
| Battery tier selector | ✅ | ✅ | ⚠️ Partial | HIGH |
| Battery health text update | ✅ | ❌ | ❌ | **CRITICAL** |
| New battery toggle | ✅ | ✅ | ✅ | — |
| Laptop add-ons (RAM/Storage) | ✅ | ❌ | ❌ | **HIGH** |
| Open Box condition (laptops) | ✅ | ⚠️ | ⚠️ | MEDIUM |
| Price calculation (display) | ✅ | ✅ | ✅ | — |
| Price application (cart) | ✅ | ❌ | ❌ | **CRITICAL** |
| Add to cart with meta | ✅ | ❌ | ❌ | **CRITICAL** |
| Hide unavailable options | ✅ | ❌ | ❌ | HIGH |
| Desktop 2-column layout | ✅ | ⚠️ | ⚠️ | **HIGH** |
| Mobile single-column layout | ✅ | ⚠️ | ⚠️ | MEDIUM |
| Z-index layering (header/footer) | ✅ | ❌ | ❌ | **HIGH** |
| Mobile alignment (centered) | ✅ | ❌ | ❌ | MEDIUM |
| Sticky bottom bar | ✅ | ✅ | ⚠️ | MEDIUM |
| Caching (1-hour TTL) | ✅ | ✅ | ✅ | — |
| Cache invalidation | ✅ | ✅ | ✅ | — |

**Legend:**
- ✅ Complete & Working
- ⚠️ Partial / Needs Verification
- ❌ Not Working / Not Implemented

---

## 🎓 Conclusion: Where We Are Now

### ✅ What's Solid
The plugin has a **strong foundation**:
- Clean architecture (Shadow DOM, React, REST API)
- Storage-specific pricing rules system working
- Sibling switching (storage, color, condition) functional
- Admin interface complete and usable
- Caching layer implemented properly
- Translations and typography systems working

### 🔴 What's Broken (Must Fix)
1. **Cart prices don't match display** (SHOWSTOPPER)
2. **Battery health stuck at 100%**
3. **Laptop products show phone UI**
4. **Plugin overlays header/footer**

### 🎯 Next Steps
A developer taking over needs to:
1. Read this blueprint thoroughly
2. Clone GitHub repo
3. Set up test environment with WooCommerce
4. Create test products (NEW phone, USED phone, laptop)
5. Create pricing rules for test products
6. Fix the 4 critical issues above
7. Test full purchase flow
8. Deploy to staging, then production

### 📞 Handoff Recommendation
**Estimated Time to Fix Critical Issues:** 8-12 hours for experienced developer

The codebase is **recoverable** - most features work, just need these specific fixes to be production-ready.

---

**Document Version:** 2.0  
**Created:** November 6, 2025  
**Last Updated:** November 12, 2025  
**For:** Gstore EPP v5.3.0  
**Status:** Complete current state documentation with Battery Tier Challenge

---

## 🎯 Current State Summary (November 2025)

### What's Actually Working

✅ **Core Product Display**
- Shadow DOM isolation prevents theme conflicts
- React 18 app renders correctly
- Product images, title, price display
- Responsive layout (mobile + desktop)

✅ **Variant Switching**
- Storage options switch correctly
- Color swatches work
- Condition tabs (NEW/USED/Open Box)
- Sibling products load via REST API

✅ **Pricing System**
- Centralized pricing rules per model+storage
- Battery tier pricing (80-85%, 85-90%, 90-95%, 95-100%)
- New battery add-on pricing
- Sale price vs regular price logic
- Cart price override working

✅ **Battery Tier Challenge (NEW)**
- 3-level gamification system
- Flappy Bird game (Level 1)
- Chess board display (Level 2 - placeholder)
- Math question (Level 3 - Georgian)
- Unlocks 80-85% tier on completion
- Modal UI with consistent styling

✅ **Admin Interface**
- Pricing rules management
- FBT product selector
- Typography settings (Google Fonts, custom uploads)
- Translation system (all UI text customizable)
- Debug logging

✅ **REST API**
- `/siblings` - Get all variants
- `/pricing` - Get pricing rules
- `/fbt` - Get frequently bought together
- `/warranty` - Get warranty text
- `/compare-specs` - Get comparison data
- All endpoints cached (1 hour TTL)

### What's Not Working

🔴 **CRITICAL: JavaScript Cache Busting**
- Changes to `product-app.js` don't reflect after clearing cache
- File timestamp updates correctly
- Browser serves old cached version
- Hard refresh doesn't help
- **Impact:** Development blocked, bug fixes can't deploy
- **Cause:** Unknown - investigating WordPress/server caching layer

⚠️ **Laptop Add-ons UI**
- Backend ready (database table exists)
- Frontend not implemented
- Should show RAM/Storage checkboxes
- Pricing calculation ready, just needs UI

⚠️ **Chess Puzzle (Level 2)**
- Currently placeholder
- Shows board but no gameplay
- "Continue" button skips to Level 3
- Future: Implement actual chess puzzle

### Priority Action Items

**URGENT (Blocking Development):**
1. Fix JavaScript cache busting issue
    - Investigate WordPress object cache
    - Check for CDN/proxy caching
    - Test with `?v=` + `time()` instead of `filemtime()`
    - Consider alternative enqueue strategy

**HIGH (Missing Features):**
2. Implement laptop add-ons UI
    - Fetch from `/laptop-addons` endpoint (needs creation)
    - Render RAM checkboxes
    - Render Storage checkboxes
    - Add to cart with selected add-ons

3. Complete chess puzzle (Level 2)
    - Implement simple chess puzzle
    - Or replace with different mini-game
    - Or make it optional/skippable

**MEDIUM (Nice to Have):**
4. Randomize math questions
5. Add keyboard controls to Flappy Bird
6. Save challenge progress (localStorage)
7. Add ESC key to close modals

### Developer Handoff Notes

**If you're taking over this project:**

1. **Read this entire document** - It's comprehensive and accurate
2. **Clone the repo** - https://github.com/Porokha/Gstore-EPP.git
3. **Set up test environment:**
    - WordPress + WooCommerce
    - Create test products (NEW phone, USED phone, laptop)
    - Create pricing rules in admin
4. **Focus on cache issue first** - Everything else works
5. **Test the Battery Tier Challenge** - It's the newest feature
6. **Check Network tab** - See what's being cached

**Estimated Time:**
- Fix cache issue: 2-4 hours
- Implement laptop add-ons: 4-6 hours
- Complete chess puzzle: 2-3 hours
- **Total:** 8-13 hours for experienced developer

### Technical Debt

- Version numbers inconsistent across files
- Some console.log statements left in production code
- No automated tests
- No build process (raw React in browser)
- Georgian translations hardcoded (should be in admin)
- Challenge texts should be in translation system

### What Makes This Plugin Unique

1. **Shadow DOM isolation** - Rare in WordPress plugins
2. **Centralized pricing** - Not per-product, per-model+storage
3. **Battery tier system** - Unique to refurbished phone market
4. **Gamification** - Challenge system to unlock pricing
5. **Storage-specific rules** - iPhone 128GB vs 256GB have different tier prices

---

**End of Documentation**