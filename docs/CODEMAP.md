# 🗺️ Product-App.js Code Map

**File:** `assets/js/product-app.js`
**Total Lines:** 2161
**Version:** v2024-11-09
**Purpose:** React-based WooCommerce product page with gamification

---

## 📑 Quick Navigation

Use your editor's "Go to Line" (Ctrl+G / Cmd+G) to jump directly:

| Section | Lines | Description |
|---------|-------|-------------|
| **Setup & Utilities** | 1-90 | Helper functions, React setup, fetchJSON |
| **Main App Function** | 91-370 | ProductApp component, state declarations |
| **Data Loading** | 371-690 | useEffect hooks (siblings, pricing, FBT, etc.) |
| **Challenge Game** | 691-1083 | Flappy Bird, Chess, Math challenge logic |
| **Helper Functions** | 1084-1280 | Pricing, comparison, UI utilities |
| **Desktop Layout** | 1281-1895 | Two-column desktop UI rendering |
| **Mobile Layout** | 1896-2150 | Single-column mobile UI rendering |
| **App Mount** | 2151-2161 | ReactDOM.render initialization |

---

## 🔍 Detailed Breakdown

### 1. Setup & Utilities (Lines 1-90)

**Lines 1-5:** Money formatting functions
```javascript
function money(n) { ... }
function gel(n) { return "₾" + money(n); }
```

**Lines 6-32:** Mount function & React setup
- Version logging
- BOOT data check
- React/ReactDOM imports

**Lines 33-90:** Utility functions
- `fetchJSONWithRetry()` - API calls with exponential backoff
- `fetchJSON()` - Simple wrapper
- `t()` - Translation system
- Icon components (CheckIcon, XIcon, etc.)

---

### 2. Main App Function (Lines 91-370)

**Lines 91-100:** Function declaration
```javascript
function ProductApp() {
```

**Lines 100-365:** State declarations (30+ useState hooks)
- Product state (siblings, current, rules)
- UI state (tabs, gallery, compare)
- Challenge state (showChallenge, challengeScreen, etc.)
- Chess/game state (chessBoard, birdY, pipes, etc.)

**Lines 366-370:** Computed values
- Gallery count
- Constants (MATH_MAX_TRIES, CHESS_DIFFICULTY)

---

### 3. Data Loading (Lines 371-690)

**All useEffect hooks for loading data from REST API:**

| Lines | Hook Purpose | API Endpoint |
|-------|--------------|--------------|
| 371-428 | Load siblings | `/siblings?product_id=` |
| 429-455 | Load pricing rules | `/pricing?product_id=` |
| 456-463 | Load FBT products | `/fbt?product_id=` |
| 464-471 | Load warranty text | `/warranty?product_id=` |
| 472-487 | Load delivery info | `/delivery?warehouse=` |
| 488-503 | Load compare specs | `/compare-specs?product_id=` |
| 504-525 | Load laptop add-ons | `/laptop-addons` |
| 526-541 | **Flappy Bird game loop** | N/A (game logic) |
| 544-550 | **Flappy Bird collision** | N/A (game logic) |
| 552-569 | **Keyboard controls** | ESC + SPACE handlers |
| 571-576 | Search products | `/products-search?search=` |
| 577-582 | Load compare product | `/compare-specs?product_id=` |
| 583-690 | Chess initialization | chess.js setup |

---

### 4. Challenge Game System (Lines 691-1083)

#### 4A. Constants & Setup (Lines 691-882)
- Challenge texts (Georgian translations)
- Color maps
- Helper functions (toAlgebraic, etc.)

#### 4B. Stockfish Chess Engine (Lines 883-951)
```javascript
function initStockfish() { ... }        // Line 883
function boardToFEN() { ... }           // Line 932
```
**Key Fix:** Line 901-924 handles WASM MessageEvent

#### 4C. Challenge Controls (Lines 952-1004)
```javascript
function startChallenge() { ... }       // Line 953
function closeChallenge() { ... }       // Line 954
function startFlappyGame() { ... }      // Line 955
function jump() { ... }                 // Line 956
function updateBoardFromFEN() { ... }   // Line 957
```

#### 4D. Chess AI & Logic (Lines 1005-1082)
```javascript
function makeAIMove(callback) { ... }   // Line 1005
function handleChessClick(row, col) { ...} // Line 1032
```
- Stockfish move generation
- Fallback random AI
- Checkmate detection

#### 4E. Math Challenge (Line 1083)
```javascript
function handleMathSubmit() { ... }
```
**Key Feature:** Dynamic answer from `BOOT.challenge.math_answer`

---

### 5. Helper Functions (Lines 1084-1280)

#### Pricing & Calculations
```javascript
function ScoreBar(score, better) { ... }      // Line 1066
function CompareRow(name, enabled) { ... }    // Line 1075
```

#### UI Components
- Comparison rendering
- Score visualization
- Tab components

#### Product Filtering
```javascript
// Lines 1129-1280: Sibling filtering by storage/color/condition
var storages = useMemo(() => { ... }, [siblings, cur.storage]);
var colors = useMemo(() => { ... }, [siblings, cur.storage]);
```

---

### 6. Desktop Layout (Lines 1281-1895)

**Structure:**
```
Desktop (≥1024px)
├── Left Column (Lines 1300-1500)
│   ├── Hero Image with Gallery
│   ├── Color Swatches
│   ├── Description
│   └── Tabs (Specs, Warranty, Compare)
│
└── Right Column (Lines 1500-1895)
    ├── Title & Price
    ├── Info Grid (4 items)
    ├── Storage Selector (phones only)
    ├── Laptop Add-ons (laptops only)
    ├── Condition Tabs (NEW/USED)
    ├── Battery Tier Selector (USED phones)
    ├── Add to Cart / Buy Now
    └── Frequently Bought Together
```

**Key Lines:**
- **1281:** Desktop layout start `return e("div", ...)`
- **1658:** Challenge modal rendering
- **1685-1780:** Left column (gallery, description, tabs)
- **1781-1895:** Right column (title, selectors, CTA)

---

### 7. Mobile Layout (Lines 1896-2150)

**Structure:**
```
Mobile (<1024px)
├── Title (top)
├── Hero Image
├── Color Swatches
├── Info Grid (4 items)
├── Storage/Condition Selectors
├── Description
├── Collapsible Tabs
├── Add to Cart (sticky)
└── FBT Section
```

**Key Lines:**
- **1896:** Mobile layout start
- **1920-1980:** Title & hero image
- **1981-2050:** Selectors & info grid
- **2051-2100:** Description & tabs
- **2101-2150:** CTA & FBT

---

### 8. App Mounting (Lines 2151-2161)

```javascript
var host = document.getElementById('gstore-epp-shadow-host');
if (host && host.shadowRoot) {
    ReactDOM.render(e(ProductApp), host.shadowRoot);
}
```

---

## 🎯 Common Tasks - Quick Reference

### Need to Change Math Challenge?
- **Admin UI:** WordPress → Gstore → Challenge Game
- **Code:** Line 1083 (`handleMathSubmit`)
- **Texts:** Lines 691-840 (CHALLENGE_TEXTS)

### Need to Fix Pricing Bug?
- **Display:** Lines 1084-1280 (priceBlock calculation)
- **Cart:** `includes/frontend/ajax.php` (backend)
- **Rules:** Lines 429-455 (pricing data loading)

### Need to Modify Chess?
- **Stockfish:** Lines 883-951
- **Chess.js logic:** Lines 583-690
- **UI:** Lines 1669-1700 (desktop), 2078+ (mobile)

### Need to Change Layout?
- **Desktop:** Lines 1281-1895
- **Mobile:** Lines 1896-2150
- **Responsive breakpoint:** 1024px (lg: in Tailwind)

### Need to Add New Feature?
- **State:** Add useState around lines 300-360
- **Data loading:** Add useEffect around lines 371-690
- **UI:** Add to both desktop (1281+) and mobile (1896+)

---

## 🔧 Development Tips

### Finding Functions Quickly

**PhpStorm Shortcuts:**
- `Ctrl+F12` (Cmd+F12) - File Structure (shows all functions)
- `Ctrl+Click` - Jump to function definition
- `Ctrl+B` - Go to declaration
- `Ctrl+Alt+Left/Right` - Navigate back/forward

**VS Code Shortcuts:**
- `Ctrl+Shift+O` (Cmd+Shift+O) - Go to Symbol
- `Ctrl+P` then `@` - List all functions
- `Ctrl+Click` - Jump to definition

### Debugging

**Find where error occurs:**
1. Check browser console for line number
2. Use this map to find section
3. Add console.log before/after suspect code

**Example:**
```
Error at line 1547
→ Check map: Lines 1500-1895 = Right Column Desktop
→ Search for line 1547 in file
→ Add: console.log('Debug:', variableName);
```

---

## 📝 Adding New Sections?

**Template:**
```javascript
// ═══════════════════════════════════════════════════
// 🎨 YOUR SECTION NAME
// Lines XXX-XXX: Brief description
// ═══════════════════════════════════════════════════

function yourNewFunction() {
    // Your code here
}
```

Update this CODEMAP.md file when adding major features!

---

## 🚀 Before Minifying (Future)

When plugin is 100% complete:

1. **Backup readable version:**
   ```bash
   cp product-app.js product-app.dev.js
   ```

2. **Minify:**
   ```bash
   uglifyjs product-app.js -o product-app.min.js -c -m
   ```

3. **Update WordPress to load .min.js**

4. **Keep .dev.js for future edits**, then re-minify

---

**Last Updated:** 2024-11-14
**Maintained by:** Development Team
**Questions?** Refer to `/docs/DOC.md` for full documentation
