// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 GSTORE EPP - PRODUCT APP (React-based WooCommerce Product Page)
// ═══════════════════════════════════════════════════════════════════════════════
// Version: v2024-11-14
// Total Lines: ~2161
// Architecture: React 18 + Shadow DOM + WooCommerce REST API
//
// 📖 NAVIGATION: See /docs/CODEMAP.md for detailed section map
// 🔍 Quick Find: Use Ctrl+F (Cmd+F) to search section markers below:
//    - [SETUP] - Helper functions & utilities
//    - [STATE] - React state declarations
//    - [DATA] - Data loading (useEffect hooks)
//    - [CHALLENGE] - Gamification system (Flappy Bird, Chess, Math)
//    - [HELPERS] - Calculation & UI helper functions
//    - [DESKTOP] - Desktop layout (≥1024px)
//    - [MOBILE] - Mobile layout (<1024px)
// ═══════════════════════════════════════════════════════════════════════════════

(function(){

    // ─────────────────────────────────────────────────────────────────────────────
    // [SETUP] UTILITY FUNCTIONS (Lines 1-90)
    // Money formatting, React setup, fetchJSON, translations
    // ─────────────────────────────────────────────────────────────────────────────

    function money(n){ var x = Number(n||0); return isFinite(x) ? Math.floor(x).toString() : "0"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
        // VERSION CHECK: Verify latest code with all fixes is loaded
        console.log('🔧 GSTORE EPP v2024-11-09-15:47 - MOBILE PADDING FIX:', {
            'Gallery thumbnails with scroll': true,
            'Fixed button widths': true,
            'Hide storage for laptops': true,
            'Click thumbnail to change hero': true,
            'Mobile padding removed': true,
            'Laptop addons': true
        });

        var BOOT = window.GSTORE_BOOT || {};
        if (!BOOT.productId) {
            console.error('GSTORE_BOOT missing:', BOOT);
            return;
        }

        var React = window.React, ReactDOM = window.ReactDOM;
        if (!React || !ReactDOM){
            console.error('React not loaded');
            return;
        }

        var e = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useMemo = React.useMemo;

        // P3 OPTIMIZED: Enhanced fetchJSON with retry logic and exponential backoff
        function fetchJSONWithRetry(url, options, retries, delay) {
            retries = retries || 3;
            delay = delay || 1000;

            return fetch(url, options)
                .then(function(r){ return r.json(); })
                .catch(function(err){
                    if (retries > 0) {
                        return new Promise(function(resolve){
                            setTimeout(function(){
                                resolve(fetchJSONWithRetry(url, options, retries - 1, delay * 2));
                            }, delay);
                        });
                    }
                    throw err;
                });
        }

        // Translation helper
        function t(key, fallback, replacements){
            var translations = BOOT.translations || {};
            var text = translations[key] || fallback;

            if (replacements && typeof replacements === 'object') {
                Object.keys(replacements).forEach(function(placeholder){
                    text = text.replace(new RegExp('{' + placeholder + '}', 'g'), replacements[placeholder]);
                });
            }

            return text;
        }

        var USED_TIERS = ['80-85','85-90','90-95','95-100'];
        var ALL_STORAGES = ['128GB', '256GB', '512GB', '1TB'];

        // Helper: Check if battery tier should be shown (only for iPhones)
        function shouldShowBatteryTier(deviceType, brand){
            var dt = (deviceType||'').toLowerCase();
            var br = (brand||'').toLowerCase();
            return dt === 'phone' && (br === 'apple' || br.indexOf('iphone') >= 0);
        }

        function Button(props){
            var base = "inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-all";
            var variant = props.variant==="outline"
                ? " border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                : " bg-blue-600 text-white hover:bg-blue-700";
            var cn = (props.className||"");
            var p = Object.assign({}, props);
            delete p.className;
            delete p.variant;
            return e("button", Object.assign({}, p, { className: (base+variant+" "+cn).trim() }), props.children);
        }

        // P4 OPTIMIZED: Error Boundary Component
        function ErrorBoundary(props) {
            var _s = useState({hasError: false, error: null});
            var errorState = _s[0]; var setErrorState = _s[1];

            useEffect(function(){
                var errorHandler = function(event){
                    console.error('Caught error:', event.error);
                    setErrorState({hasError: true, error: event.error});
                };
                window.addEventListener('error', errorHandler);
                return function(){ window.removeEventListener('error', errorHandler); };
            }, []);

            if (errorState.hasError) {
                return e("div", {className: "p-6 text-center"},[
                    e("h2", {key: "title", className: "text-xl font-bold text-red-600 mb-2"}, "Something went wrong"),
                    e("p", {key: "msg", className: "text-gray-600 mb-4"}, "We're sorry, but something unexpected happened."),
                    e("button", {
                        key: "reload",
                        className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700",
                        onClick: function(){ window.location.reload(); }
                    }, "Reload Page")
                ]);
            }

            return props.children;
        }

        // P4 OPTIMIZED: Loading Skeleton Component
        function LoadingSkeleton() {
            return e("div", {className: "animate-pulse space-y-4 p-6"},[
                e("div", {key: "img", className: "bg-gray-200 h-64 rounded-lg"}),
                e("div", {key: "title", className: "bg-gray-200 h-6 w-3/4 rounded"}),
                e("div", {key: "price", className: "bg-gray-200 h-8 w-1/2 rounded"}),
                e("div", {key: "desc", className: "space-y-2"},[
                    e("div", {key: "l1", className: "bg-gray-200 h-4 rounded"}),
                    e("div", {key: "l2", className: "bg-gray-200 h-4 w-5/6 rounded"})
                ])
            ]);
        }

        function fetchJSON(url){
            return fetch(url, {credentials:'same-origin'})
                .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); });
        }

        // Comprehensive color mapping for major phone brands
        var COLOR_MAP = {
            // iPhone Colors (all generations)
            'natural titanium': '#A8A8A3',
            'blue titanium': '#4E5B6B',
            'white titanium': '#F5F5F0',
            'black titanium': '#3D3D3F',
            'desert titanium': '#D4C5B0',
            'cosmic orange': '#FF6B35',
            'space black': '#2C2C2E',
            'silver': '#E3E4E5',
            'gold': '#FAD7BD',
            'deep purple': '#594F63',
            'sierra blue': '#A7C1D9',
            'graphite': '#52514D',
            'alpine green': '#576856',
            'midnight': '#232A31',
            'starlight': '#F9F6F3',
            'product red': '#BF0013',
            '(product)red': '#BF0013',
            'blue': '#276787',
            'pink': '#FAE5D3',
            'yellow': '#FFD33C',
            'green': '#ADE0CD',
            'purple': '#D1CDDA',
            'coral': '#FF6961',
            'pacific blue': '#2F5C7C',
            'rose gold': '#E0BFB8',
            'jet black': '#0D0D0D',
            'matte black': '#1C1C1C',
            'space gray': '#7D7E80',
            'space grey': '#7D7E80',

            // Samsung Galaxy Colors
            'phantom black': '#1E1E1E',
            'phantom white': '#F4F4F4',
            'phantom gray': '#6B6B6B',
            'phantom grey': '#6B6B6B',
            'phantom silver': '#C0C0C0',
            'phantom violet': '#8B7BA8',
            'phantom pink': '#E8C4D8',
            'phantom green': '#C1D5C0',
            'cream': '#F5EFE7',
            'lavender': '#E6E6FA',
            'graphite': '#52514D',
            'burgundy': '#800020',
            'mystic bronze': '#CD7F32',
            'mystic black': '#1A1A1A',
            'mystic white': '#F8F8F8',
            'mystic gray': '#8E8E8E',
            'mystic grey': '#8E8E8E',
            'cloud blue': '#A7C7E7',
            'cloud pink': '#FFB6C1',
            'cloud white': '#FAFAFA',
            'aura glow': '#E8E8E8',
            'aura black': '#000000',
            'aura blue': '#4A90E2',
            'prism black': '#1C1C1C',
            'prism white': '#FFFFFF',
            'prism blue': '#4169E1',
            'prism green': '#50C878',

            // Google Pixel Colors
            'obsidian': '#1F1F1F',
            'porcelain': '#F8F5F0',
            'hazel': '#6B705C',
            'bay': '#5B8FA3',
            'rose': '#F4C2C2',
            'snow': '#FFFFFF',
            'sorta seafoam': '#98D8C8',
            'kinda coral': '#FF8A80',
            'just black': '#000000',
            'clearly white': '#FFFFFF',
            'oh so orange': '#FF6F00',
            'stormy black': '#2C2C2E',
            'cloudy white': '#F5F5F5',
            'sage': '#87AE73',
            'sorta sage': '#87AE73',
            'sorta sunny': '#FFD54F',
            'kinda blue': '#5B9BD5',

            // Generic/Common colors
            'black': '#000000',
            'white': '#FFFFFF',
            'red': '#FF0000',
            'orange': '#FF8C00',
            'titanium': '#878681'
        };

        // Get hex color from color name
        function getColorHex(colorName) {
            if (!colorName) return '#333';
            var normalized = String(colorName).toLowerCase().trim();
            return COLOR_MAP[normalized] || '#333';
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // [STATE] MAIN APP COMPONENT & STATE MANAGEMENT (Lines 255-486)
        // React component with 30+ useState hooks for product, UI, and challenge state
        // ─────────────────────────────────────────────────────────────────────────────

        function ProductApp(){
            // Inject modal animations CSS
            useEffect(function(){
                if(!document.getElementById('modal-animations')){
                    var style = document.createElement('style');
                    style.id = 'modal-animations';
                    style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
                    document.head.appendChild(style);
                }
            }, []);

            // P3 OPTIMIZED: Consolidated state management with useReducer
            var useReducer = React.useReducer;

            // State reducer for better organization
            function stateReducer(state, action) {
                switch (action.type) {
                    case 'SET_SIBLINGS': return {...state, siblings: action.payload};
                    case 'SET_CURRENT': return {...state, cur: action.payload};
                    case 'UPDATE_CURRENT': return {...state, cur: {...state.cur, ...action.payload}};
                    case 'SET_RULES': return {...state, rules: action.payload};
                    case 'SET_TIER': return {...state, tier: action.payload};
                    case 'SET_NEW_BAT': return {...state, newBat: action.payload};
                    case 'SET_FBT': return {...state, fbt: action.payload};
                    case 'SET_SELECTED_FBT': return {...state, selectedFBT: action.payload};
                    case 'TOGGLE_FBT':
                        var id = action.payload;
                        var isSelected = state.selectedFBT.includes(id);
                        return {...state, selectedFBT: isSelected
                                ? state.selectedFBT.filter(function(x){ return x !== id; })
                                : state.selectedFBT.concat([id])
                        };
                    case 'SET_ACTIVE_TAB': return {...state, activeTab: action.payload};
                    case 'SET_COND': return {...state, cond: action.payload};
                    case 'SET_COMPARE_PRODUCT': return {...state, compareProduct: action.payload};
                    case 'SET_SHOW_SEARCH': return {...state, showSearch: action.payload};
                    case 'SET_SEARCH_QUERY': return {...state, searchQuery: action.payload};
                    case 'SET_SEARCH_RESULTS': return {...state, searchResults: action.payload};
                    case 'SET_CURRENT_SPECS': return {...state, currentSpecs: action.payload};
                    case 'SET_COMPARE_SPECS': return {...state, compareSpecs: action.payload};
                    case 'SET_DELIVERY_TEXT': return {...state, deliveryText: action.payload};
                    case 'SET_SHOW_WARRANTY_MODAL': return {...state, showWarrantyModal: action.payload};
                    case 'SET_LOADING': return {...state, isLoading: action.payload};
                    default: return state;
                }
            }

            var initialState = {
                siblings: [],
                cur: {
                    productId: BOOT.productId,
                    title: BOOT.title,
                    permalink: BOOT.permalink,
                    price: BOOT.price,
                    regular: BOOT.regular,
                    sale: BOOT.sale,
                    color: BOOT.color,
                    condition: (BOOT.condition||'').toLowerCase(),
                    deviceType: BOOT.deviceType || 'phone',
                    brand: BOOT.brand || '',
                    storage: BOOT.storage || '',
                    image: BOOT.image
                },
                rules: null,
                tier: ((BOOT.condition||'').toLowerCase() === 'used') ? 'pending' : null,
                newBat: false,
                fbt: [],
                selectedFBT: [],
                activeTab: (typeof window!=='undefined' && window.innerWidth<=768) ? null : 'specifications',
                cond: (BOOT.condition||'').toLowerCase() === 'new' ? 'new' : 'used',
                compareProduct: null,
                showSearch: false,
                searchQuery: '',
                searchResults: [],
                currentSpecs: {},
                compareSpecs: {},
                deliveryText: '',
                showWarrantyModal: false,
                isLoading: true
            };

            var _reducer = useReducer(stateReducer, initialState);
            var state = _reducer[0]; var dispatch = _reducer[1];

            // Destructure for backward compatibility
            var siblings = state.siblings;
            var cur = state.cur;
            var rules = state.rules;
            var tier = state.tier;
            var newBat = state.newBat;
            var fbt = state.fbt;
            var selectedFBT = state.selectedFBT;
            var specs = state.specs;
            var delivery = state.delivery;

            // Laptop addons state
            var _useState14 = useState([]);
            var laptopAddons = _useState14[0];
            var setLaptopAddons = _useState14[1];
            var _useState15 = useState([]);
            var selectedAddons = _useState15[0];
            var setSelectedAddons = _useState15[1];

            // Gallery state
            var _useState11 = useState(cur.image || BOOT.image);
            var heroImage = _useState11[0];
            var setHeroImage = _useState11[1];
            var _useState12 = useState(0);
            var galleryScroll = _useState12[0];
            var setGalleryScroll = _useState12[1];
            var _useState13 = useState(null);
            var heroImageHeight = _useState13[0];
            var setHeroImageHeight = _useState13[1];

            // Battery Tier Challenge state
            var _useState16 = useState(false); var showChallenge = _useState16[0]; var setShowChallenge = _useState16[1];
            var _useState17 = useState(false); var challengeUnlocked = _useState17[0]; var setChallengeUnlocked = _useState17[1];
            var _useState18 = useState(null); var challengeScreen = _useState18[0]; var setChallengeScreen = _useState18[1];
            var _useState19 = useState(1); var challengeLevel = _useState19[0]; var setChallengeLevel = _useState19[1];
            var _useState20 = useState(0); var challengeScore = _useState20[0]; var setChallengeScore = _useState20[1];
            var _useState21 = useState([]); var pipes = _useState21[0]; var setPipes = _useState21[1];
            var _useState22 = useState(200); var birdY = _useState22[0]; var setBirdY = _useState22[1];
            var _useState23 = useState(0); var velocity = _useState23[0]; var setVelocity = _useState23[1];
            var _useState24 = useState(false); var gameRunning = _useState24[0]; var setGameRunning = _useState24[1];
            var _useState25 = useState(5); var mathTries = _useState25[0]; var setMathTries = _useState25[1];
            var _useState26 = useState(''); var mathInput = _useState26[0]; var setMathInput = _useState26[1];
            var _useState27 = useState(''); var mathFeedback = _useState27[0]; var setMathFeedback = _useState27[1];
            var _useState28 = useState(null); var chessGame = _useState28[0]; var setChessGame = _useState28[1];
            var _useState29 = useState([]); var chessBoard = _useState29[0]; var setChessBoard = _useState29[1];
            var _useState30 = useState(null); var selectedSquare = _useState30[0]; var setSelectedSquare = _useState30[1];

            var gallery = BOOT.gallery || [];
            var hasGallery = gallery.length > 0;

            // Calculate visible thumbnails based on available height
            var visibleGalleryCount = useMemo(function(){
                if (!heroImageHeight) return isMobile ? 3 : 4; // Default

                // Since gallery is centered, we can be more generous with space
                var thumbSize = isMobile ? 32 : 60; // thumbnail size
                var gap = isMobile ? 4 : 8; // gap between items
                var arrowHeight = isMobile ? 20 : 28; // each arrow button
                var arrowMargin = isMobile ? 4 : 8; // margin around arrows

                // Calculate how many thumbnails fit in 70% of hero height (centered layout)
                var usableHeight = heroImageHeight * 0.7;
                var spaceForThumbs = usableHeight - (arrowHeight * 2) - (arrowMargin * 2);
                var maxThumbs = Math.floor((spaceForThumbs + gap) / (thumbSize + gap));

                // Ensure minimum display: 3 for mobile, 3 for desktop
                var minThumbs = isMobile ? 3 : 3;
                return Math.max(minThumbs, Math.min(maxThumbs, gallery.length));
            }, [heroImageHeight, isMobile, gallery.length]);

            var maxScroll = Math.max(0, gallery.length - visibleGalleryCount);

            // Sync heroImage with cur.image when product changes
            useEffect(function(){
                setHeroImage(cur.image || BOOT.image);
                setGalleryScroll(0); // Reset scroll when product changes
            }, [cur.productId]);

            var activeTab = state.activeTab;
            var cond = state.cond;
            var compareProduct = state.compareProduct;
            var showSearch = state.showSearch;
            var searchQuery = state.searchQuery;
            var searchResults = state.searchResults;
            var currentSpecs = state.currentSpecs;
            var compareSpecs = state.compareSpecs;
            var deliveryText = state.deliveryText;
            var showWarrantyModal = state.showWarrantyModal;
            var isLoading = state.isLoading;

            // Helper setters for backward compatibility
            var setSiblings = function(val){ dispatch({type: 'SET_SIBLINGS', payload: val}); };
            var setCur = function(val){ dispatch({type: 'SET_CURRENT', payload: val}); };
            var setRules = function(val){ dispatch({type: 'SET_RULES', payload: val}); };
            var setTier = function(val){ dispatch({type: 'SET_TIER', payload: val}); };
            var setNewBat = function(val){ dispatch({type: 'SET_NEW_BAT', payload: val}); };
            var setFbt = function(val){ dispatch({type: 'SET_FBT', payload: val}); };
            var setSelectedFBT = function(val){ dispatch({type: 'SET_SELECTED_FBT', payload: val}); };
            var setActiveTab = function(val){ dispatch({type: 'SET_ACTIVE_TAB', payload: val}); };
            var setCond = function(val){ dispatch({type: 'SET_COND', payload: val}); };
            var setCompareProduct = function(val){ dispatch({type: 'SET_COMPARE_PRODUCT', payload: val}); };
            var setShowSearch = function(val){ dispatch({type: 'SET_SHOW_SEARCH', payload: val}); };
            var setSearchQuery = function(val){ dispatch({type: 'SET_SEARCH_QUERY', payload: val}); };
            var setSearchResults = function(val){ dispatch({type: 'SET_SEARCH_RESULTS', payload: val}); };
            var setCurrentSpecs = function(val){ dispatch({type: 'SET_CURRENT_SPECS', payload: val}); };
            var setCompareSpecs = function(val){ dispatch({type: 'SET_COMPARE_SPECS', payload: val}); };
            var setDeliveryText = function(val){ dispatch({type: 'SET_DELIVERY_TEXT', payload: val}); };
            var setShowWarrantyModal = function(val){ dispatch({type: 'SET_SHOW_WARRANTY_MODAL', payload: val}); };
            var setLoading = function(val){ dispatch({type: 'SET_LOADING', payload: val}); };

            var modalContentRef = React.useRef(null);

            // Lock body scroll when modal is open
            useEffect(function(){
                if (showWarrantyModal) {
                    var scrollY = window.scrollY;
                    document.body.style.position = 'fixed';
                    document.body.style.top = '-' + scrollY + 'px';
                    document.body.style.width = '100%';
                    return function(){
                        document.body.style.position = '';
                        document.body.style.top = '';
                        document.body.style.width = '';
                        window.scrollTo(0, scrollY);
                    };
                } else {
                    document.body.style.position = '';
                    document.body.style.top = '';
                    document.body.style.width = '';
                }
            }, [showWarrantyModal]);

            // Handle scroll on modal wrapper - redirect to content
            function handleModalWrapperScroll(ev){
                if (modalContentRef.current) {
                    modalContentRef.current.scrollTop += ev.deltaY;
                }
            }

            // P4 OPTIMIZED: Set loading false once initial data loads
            useEffect(function(){
                var timer = setTimeout(function(){
                    setLoading(false);
                }, 500); // Minimum loading time for smooth UX
                return function(){ clearTimeout(timer); };
            }, []);

            // ─────────────────────────────────────────────────────────────────────────────
            // [DATA] DATA LOADING HOOKS (Lines 371-690)
            // All useEffect hooks for REST API calls and data initialization
            // ─────────────────────────────────────────────────────────────────────────────

            // Load siblings
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/siblings?product_id=' + cur.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setSiblings(j.siblings||[]); }
                }).catch(function(e){ console.error('siblings fetch failed', e); });
            }, [cur.productId]);

            // Load the pricing and set default tier - reload when product changes
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/pricing?product_id=' + cur.productId;
                fetchJSON(url).then(function(j){
                    setRules(j);
                    // Set default tier only if tier is null (product just switched)
                    var currentCond = (cur.condition||'').toLowerCase();
                    if (j && j.exists && j.default_condition && currentCond==='used'){
                        setTier(function(prevTier){
                            // Only set default if no tier is currently selected
                            return prevTier === null ? j.default_condition : prevTier;
                        });
                    }
                }).catch(function(e){ console.error('pricing fetch failed', e); });
            }, [cur.productId, cur.condition]);

            // Load FBT - reload when product changes (storage switch)
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/fbt?product_id=' + cur.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setFbt(j.products || []); }
                }).catch(function(e){ console.error('fbt fetch failed', e); });
            }, [cur.productId]);

            // Load current product specs
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/compare-specs?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setCurrentSpecs(j.specs || {}); }
                }).catch(function(e){ console.error('specs fetch failed', e); });
            }, []);

            // Load delivery text based on warehouse
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/delivery?warehouse=' + encodeURIComponent(BOOT.warehouse || 'tbilisi');
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setDeliveryText(j.delivery_text || ''); }
                }).catch(function(e){ console.error('delivery fetch failed', e); });
            }, [BOOT.warehouse]);

            // Load laptop addons
            useEffect(function(){
                if (cur.deviceType !== 'laptop') return;
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/laptop-addons';
                fetchJSON(url).then(function(j){
                    if (j && j.ok){
                        var allAddons = [];
                        if (j.laptop_ram && j.laptop_ram.length > 0){ j.laptop_ram.forEach(function(item){ allAddons.push({...item, type: 'ram'}); }); }
                        if (j.laptop_storage && j.laptop_storage.length > 0){ j.laptop_storage.forEach(function(item){ allAddons.push({...item, type: 'storage'}); }); }
                        setLaptopAddons(allAddons);
                    }
                }).catch(function(e){ console.error('laptop addons fetch failed', e); });
            }, [cur.deviceType]);

            // Flappy Bird Game Loop
            useEffect(function(){
                if (challengeScreen !== 'game' || !gameRunning) return;
                var gravity = 0.3; var pipeSpeed = 1.6; var frame;
                var loop = function(){
                    setBirdY(function(prev){ return Math.max(0, Math.min(460, prev + velocity)); });
                    setVelocity(function(v){ return v + gravity; });
                    setPipes(function(prev){
                        var moved = prev.map(function(p){ return {x: p.x - pipeSpeed, gapY: p.gapY, scored: p.scored}; }).filter(function(p){ return p.x > -60; });
                        if (Math.random() < 0.009){ var gapY = 140 + Math.random() * 180; moved.push({x: 420, gapY: gapY, scored: false}); }
                        return moved;
                    });
                    frame = requestAnimationFrame(loop);
                };
                frame = requestAnimationFrame(loop);
                return function(){ cancelAnimationFrame(frame); };
            }, [challengeScreen, gameRunning, velocity]);

            // Flappy Bird Collision
            useEffect(function(){
                if (challengeScreen !== 'game' || !gameRunning) return;
                var gapHalf = 100;
                var targetScore = (BOOT.challenge && BOOT.challenge.flappy_score) ? parseInt(BOOT.challenge.flappy_score) * 10 : 50;
                setPipes(function(prev){ return prev.map(function(p){ if (!p.scored && p.x < 60){ setChallengeScore(function(s){ var newScore = s + 10; if (newScore >= targetScore && challengeLevel === 1){ setChallengeLevel(2); setGameRunning(false); setChallengeScreen('level2'); } return newScore; }); return {...p, scored: true}; } return p; }); });
                for (var i = 0; i < pipes.length; i++){ var p = pipes[i]; if (p.x < 80 && p.x > 20){ if (birdY < p.gapY - gapHalf || birdY > p.gapY + gapHalf){ setGameRunning(false); setChallengeScreen('lose'); return; } } }
            }, [birdY, pipes, challengeScore, challengeLevel, gameRunning, challengeScreen]);

            // Track challenge screen transitions for analytics
            useEffect(function(){
                if(!challengeScreen) return;
                if(challengeScreen === 'level2' && challengeLevel === 2){
                    trackChallengeEvent('level1_completed', {score: challengeScore});
                } else if(challengeScreen === 'lose'){
                    trackChallengeEvent('level1_failed', {score: challengeScore});
                } else if(challengeScreen === 'math'){
                    trackChallengeEvent('level2_completed', {});
                }
            }, [challengeScreen]);

            // Keyboard controls: ESC to close modals, SPACE for Flappy Bird jump
            useEffect(function(){
                function handleKeyPress(e){
                    // ESC key: Close challenge modal
                    if (e.key === 'Escape' || e.keyCode === 27){
                        if (showChallenge && challengeScreen === 'intro'){
                            closeChallenge();
                        }
                    }
                    // SPACE key: Flappy Bird jump (only during game)
                    if ((e.key === ' ' || e.keyCode === 32) && challengeScreen === 'game' && gameRunning){
                        e.preventDefault(); // Prevent page scroll
                        jump();
                    }
                }
                document.addEventListener('keydown', handleKeyPress);
                return function(){ document.removeEventListener('keydown', handleKeyPress); };
            }, [showChallenge, challengeScreen, gameRunning]);

            // Search products
            useEffect(function(){
                if (!searchQuery) {
                    setSearchResults([]);
                    return;
                }
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/products-search?search=' + encodeURIComponent(searchQuery) + '&limit=10';
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setSearchResults(j.products || []); }
                }).catch(function(e){ console.error('search failed', e); });
            }, [searchQuery]);

            // Load compare product specs
            useEffect(function(){
                if (!compareProduct) {
                    setCompareSpecs({});
                    return;
                }
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/compare-specs?product_id=' + compareProduct;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setCompareSpecs(j.specs || {}); }
                }).catch(function(e){ console.error('compare specs failed', e); });
            }, [compareProduct]);

            // SMART DEFAULT: Apply default tier when switching to USED
            useEffect(function(){
                if (cond === 'used' && rules && rules.exists && rules.default_condition) {
                    setTier(rules.default_condition);
                } else if (cond === 'new') {
                    setTier(null);
                }
            }, [cond, rules]);

            var avail = useMemo(function(){
                var hasNew=false, hasUsed=false, hasOpen=false;
                siblings.forEach(function(p){
                    var c = String(p.condition||'').toLowerCase();
                    if (c==='new') hasNew=true;
                    else if (c==='used') hasUsed=true;
                    else if (c.replace(/\s+/g,'')==='openbox') hasOpen=true;
                });
                return {hasNew:hasNew, hasUsed:hasUsed, hasOpen:hasOpen};
            }, [siblings]);

            var storages = useMemo(function(){
                var available = {};
                siblings.forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    var match = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    if (match && p.storage){
                        available[p.storage] = true;
                    }
                });
                return available;
            }, [siblings, cond]);

            var colors = useMemo(function(){
                var seen = {};
                var list = [];
                siblings.forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    var condMatch = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    var storageMatch = !cur.storage || String(p.storage).toLowerCase()===String(cur.storage).toLowerCase();

                    if (condMatch && storageMatch){
                        var colorStr = String(p.color||'').toLowerCase().trim();
                        var key = colorStr || ('id-'+p.id);
                        if (!seen[key]){
                            seen[key]=true;
                            // Prioritize COLOR_MAP, fallback to database hex
                            var mappedHex = getColorHex(p.color);
                            var hexColor = (mappedHex !== '#333') ? mappedHex : (p.hex || '#333');
                            list.push({ id:p.id, color:p.color||'', hex:hexColor, image:p.image });
                        }
                    }
                });
                return list;
            }, [siblings, cond, cur.storage]);

            function switchToProductId(id){
                var p = siblings.find(function(x){ return Number(x.id)===Number(id); });
                if (!p) return;

                // Update BOOT.productId to sync with WP admin edit link
                BOOT.productId = p.id;

                // Update WordPress edit link if it exists (for logged-in admins)
                var editLink = document.querySelector('.post-edit-link');
                if (editLink) {
                    var currentHref = editLink.getAttribute('href');
                    if (currentHref) {
                        // Replace the post parameter with the new product ID
                        var newHref = currentHref.replace(/([?&]post=)\d+/, '$1' + p.id);
                        editLink.setAttribute('href', newHref);
                    }
                }

                setCur({
                    productId: p.id,
                    title: p.title,
                    permalink: p.permalink,
                    price: p.price,
                    regular: p.regular,
                    sale: p.sale,
                    color: p.color,
                    condition: (p.condition||'').toLowerCase(),
                    deviceType: cur.deviceType,
                    brand: cur.brand,
                    storage: p.storage||'',
                    image: p.image
                });
                var newCond = ((p.condition||'').toLowerCase()==='new') ? 'new':'used';
                setCond(newCond);
                setNewBat(false);
                setSelectedAddons([]);

                // Always reset tier immediately to prevent price mismatch
                setTier(null);

                try { window.history.replaceState({}, "", p.permalink); } catch(e){}
            }

            function switchStorage(st){
                var p = siblings.find(function(x){
                    var pc = String(x.condition||'').toLowerCase();
                    var condMatch = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    return condMatch && String(x.storage).toLowerCase()===String(st).toLowerCase();
                });
                if (p) switchToProductId(p.id);
            }

            // SMART DEFAULT: Auto-select storage when condition changes
            useEffect(function(){
                var availableStorages = Object.keys(storages);
                if (availableStorages.length > 0) {
                    // Always switch to matching product when condition changes
                    // If current storage exists in new condition, use it; otherwise use first available
                    var targetStorage = storages[cur.storage] ? cur.storage : availableStorages[0];
                    switchStorage(targetStorage);
                }
            }, [cond]);

            var priceBlock = useMemo(function(){
                var reg = parseFloat(cur.regular||cur.price||0);
                var sale = parseFloat(cur.sale||0);
                var showSale = (sale>0 && sale<reg) ? sale : null;

                // Use cur.condition instead of cond state to avoid sync issues
                var currentCondition = (cur.condition||'').toLowerCase();

                if (!rules || !rules.exists || currentCondition==='new'){
                    var base = showSale!=null ? sale : reg;
                    return {base:base||0, reg:reg||0, sale:showSale, hasSale:!!showSale};
                }

                var pr = rules.pricing||{};
                if (!tier){
                    var base2 = showSale!=null ? sale : reg;
                    return {base:base2||0, reg:reg||0, sale:showSale, hasSale:!!showSale};
                }

                var chosen = pr[tier] || {};
                if (!chosen.regular && !chosen.sale){
                    var base3 = showSale!=null ? sale : reg;
                    return {base:base3||0, reg:reg||0, sale:showSale, hasSale:!!showSale};
                }

                var r = parseFloat(chosen.regular||0);
                var s = parseFloat(chosen.sale||0);
                var base4 = (s>0 && s<r) ? s : r;

                // Don't add battery price here - it's added separately in grandTotal
                // This was causing double-charging

                return {base:base4||0, reg:r||0, sale:(s>0 && s<r)?s:null, hasSale:(s>0 && s<r)};
            }, [cur.productId, cur.price, cur.regular, cur.sale, cur.storage, cur.condition, rules, tier, newBat]);

            var batteryPriceBlock = useMemo(function(){
                if (!rules || !rules.exists || !rules.pricing) return {price:0, regular:0, sale:null, hasSale:false};
                var nb = rules.pricing['new_battery']||{};
                var reg = parseFloat(nb.regular||0);
                var sale = parseFloat(nb.sale||0);
                var hasSale = (sale > 0 && sale < reg);
                return {
                    price: hasSale ? sale : reg,
                    regular: reg,
                    sale: hasSale ? sale : null,
                    hasSale: hasSale
                };
            }, [rules]);

            var batteryPrice = batteryPriceBlock.price;

            var fbtTotal = useMemo(function(){
                var total = 0;
                selectedFBT.forEach(function(id){
                    var item = fbt.find(function(x){ return Number(x.id)===Number(id); });
                    if (item) total += parseFloat(item.price||0);
                });
                return total;
            }, [selectedFBT, fbt]);

            var addonsTotal = useMemo(function(){
                var total = 0;
                selectedAddons.forEach(function(key){
                    var addon = laptopAddons.find(function(a){ return a.key === key; });
                    if (addon) total += parseFloat(addon.price||0);
                });
                return total;
            }, [selectedAddons, laptopAddons]);

            var grandTotal = priceBlock.base + fbtTotal + (newBat ? batteryPrice : 0) + addonsTotal;

            function toggleAddon(key){
                var idx = selectedAddons.indexOf(key);
                if (idx >= 0){
                    setSelectedAddons(selectedAddons.filter(function(k){ return k !== key; }));
                } else {
                    setSelectedAddons(selectedAddons.concat([key]));
                }
            }

            function addToCart(redirect){
                var fd = new FormData();
                fd.append('action', 'gstore_epp_add_to_cart');
                fd.append('nonce', BOOT.ajax.nonce);
                fd.append('product_id', cur.productId);
                fd.append('quantity', 1);
                fd.append('condition', cond);
                fd.append('tier', tier||'');
                fd.append('new_battery', newBat?1:0);

                // Build laptop addons data
                var addonsData = {total: addonsTotal, items: []};
                selectedAddons.forEach(function(key){
                    var addon = laptopAddons.find(function(a){ return a.key === key; });
                    if (addon){
                        addonsData.items.push({key: addon.key, label: addon.label, price: addon.price});
                    }
                });
                try{ fd.append('laptop_addons', JSON.stringify(addonsData)); }catch(e){ fd.append('laptop_addons','{}'); }
                fetch(BOOT.ajax.url, { method:'POST', body:fd, credentials:'same-origin' })
                    .then(function(r){ return r.json(); })
                    .then(function(res){
                        if (res && res.success){
                            if (redirect) {
                                window.location.href = redirect;
                            } else {
                                // Trigger WooCommerce cart fragments refresh to update cart count
                                if (typeof jQuery !== 'undefined') {
                                    jQuery(document.body).trigger('wc_fragment_refresh');
                                    jQuery(document.body).trigger('added_to_cart');
                                }
                                // No alert - silent add to cart
                            }
                        }
                        else { alert('Failed to add to cart'); console.error(res); }
                    })
                    .catch(function(err){ console.error(err); alert('Failed to add to cart'); });
            }

            function CondButton(lbl, key, enabled){ if(!enabled){ return null; }
                var active = (cond===key);
                var cls = "text-center py-2 text-sm font-medium border border-gray-200 rounded-lg ";
                if (!enabled) {
                    cls += "bg-gray-100 text-gray-400 cursor-not-allowed";
                } else if (active) {
                    cls += "bg-blue-600 text-white border-blue-600";
                } else {
                    cls += "bg-white text-gray-700 hover:bg-blue-50";
                }
                return e("button",{
                    className:cls,
                    style:{width:'90px'},
                    disabled:!enabled,
                    onClick:function(){ if(enabled){ setTier(null); setNewBat(false); setCond(key); } }
                }, lbl);
            }

            // P3 OPTIMIZED: Use reducer action for FBT toggle
            function toggleFBT(id){ dispatch({type: 'TOGGLE_FBT', payload: id}); }

            // ─────────────────────────────────────────────────────────────────────────────
            // [CHALLENGE] GAMIFICATION SYSTEM (Lines 691-1083)
            // 3-level challenge: Flappy Bird → Chess → Math
            // Unlocks 80-85% battery tier pricing on completion
            // ─────────────────────────────────────────────────────────────────────────────

            // Battery Tier Challenge Functions - Load from BOOT.challenge
            var CHALLENGE_TEXTS = BOOT.challenge || {unlock_btn:'დაიმსახურე ყველაზე დაბალი ფასი!',unlocked_btn:'✅ განსაკუთრებული ფასი გახსნილია!',intro_title:'დაიმსახურე ყველაზე დაბალი ფასი!',intro_desc2:'ამას დამსახურება სჭირდება!',intro_desc3:'დაგვამარცხე სამ დონიან თამაშში და მიიღე განსაკუთრებული ფასი.',start_btn:'დაწყება',lose_title:'შენ დამარცხდი',lose_desc:'არ დანებდე, დაგვამარცხე და დაიმსახურე!',try_again:'კიდევ სცადე',level2_title:'შენ გადახვედი მეორე დონეზე!',level2_desc1:'ყოჩაღ, შენ შეძელი და გაიარე პირველი დაბრკოლება.',level2_desc2:'შემდეგი მისია: ჭადრაკი',continue_btn:'გაგრძელება',chess_title:'მეორე დონე: დაამარცხე ჭადრაკში Gstore Chess AI',math_title:'დონე მესამე: მათემატიკური პრობლემა',math_question:'რა არის 6 × 7 ?',submit_btn:'სცადე',congratulations:'გილოცავ',flappy_score:5,chess_difficulty:'2',math_tries:5,score:'ქულა',close_btn:'დახურვა'};
            // Add dynamic functions that can't be stored in database
            CHALLENGE_TEXTS.intro_desc1 = function(title){ return 'შენ ცდილობ იყიდო ' + title + ' ყველაზე დაბალ ფასად!'; };
            CHALLENGE_TEXTS.math_tries = function(tries){ return 'შენ გაქვს ' + tries + ' მცდელობა'; };
            // Ensure score is always available
            if(!CHALLENGE_TEXTS.score) CHALLENGE_TEXTS.score = 'ქულა';

            var FLAPPY_TARGET_SCORE = parseInt(CHALLENGE_TEXTS.flappy_score) || 5;
            var CHESS_DIFFICULTY = parseInt(CHALLENGE_TEXTS.chess_difficulty) || 2;
            var MATH_MAX_TRIES = parseInt(CHALLENGE_TEXTS.math_tries) || 5;

            // Chess.js instance for proper chess rules - use ref to persist across renders
            var useRef = React.useRef;
            var chessInstanceRef = useRef(null);
            var chessInstance = chessInstanceRef.current;

            // Initialize Stockfish engine
            var stockfishEngine = null;
            var stockfishReady = false;
            var pendingStockfishMove = null;
            var currentFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Starting position
            var moveHistory = []; // Track moves in algebraic notation

            function initStockfish(){
                if(stockfishEngine) return;
                if(typeof Stockfish !== 'function'){
                    console.warn('⚠️ Stockfish not available');
                    return;
                }
                try{
                    console.log('🤖 Initializing Stockfish WASM...');
                    // Call Stockfish() without 'new' - it returns the engine instance
                    stockfishEngine = Stockfish();

                    if(!stockfishEngine || typeof stockfishEngine.postMessage !== 'function'){
                        console.error('❌ Stockfish API error');
                        stockfishEngine = null;
                        return;
                    }

                    // WASM version sends message events with .data property
                    stockfishEngine.onmessage = function(event){
                        // Handle both event object (WASM) and string (fallback)
                        var line = (typeof event === 'string') ? event : (event.data || event);
                        console.log('Stockfish:', line);

                        if(line.includes('uciok')){
                            stockfishReady = true;
                            var skillLevel = Math.max(0, Math.min(20, CHESS_DIFFICULTY * 4));
                            console.log('✅ Stockfish ready! Skill level: ' + skillLevel);
                            stockfishEngine.postMessage('setoption name Skill Level value ' + skillLevel);
                            stockfishEngine.postMessage('ucinewgame');
                        }

                        if(line.includes('bestmove') && pendingStockfishMove){
                            var match = line.match(/bestmove\s+([a-h][1-8])([a-h][1-8])/);
                            if(match){
                                var from = {row: 8 - parseInt(match[1][1]), col: match[1].charCodeAt(0) - 97};
                                var to = {row: 8 - parseInt(match[2][1]), col: match[2].charCodeAt(0) - 97};
                                console.log('👍 Stockfish move:', match[1] + match[2]);
                                pendingStockfishMove({from:from, to:to});
                                pendingStockfishMove = null;
                            }
                        }
                    };

                    stockfishEngine.postMessage('uci');
                } catch(e){
                    console.error('❌ Stockfish init error:', e);
                    stockfishEngine = null;
                    stockfishReady = false;
                }
            }

            function boardToFEN(board, turn){
                var fen = '';
                for(var r=0; r<8; r++){
                    var empty = 0;
                    for(var c=0; c<8; c++){
                        var p = board[r][c];
                        if(!p){
                            empty++;
                        } else {
                            if(empty > 0){ fen += empty; empty = 0; }
                            var piece = p.piece;
                            fen += (p.color === 'white' ? piece.toUpperCase() : piece);
                        }
                    }
                    if(empty > 0) fen += empty;
                    if(r < 7) fen += '/';
                }
                fen += ' ' + (turn === 'white' ? 'w' : 'b') + ' KQkq - 0 1';
                return fen;
            }

            // ─── Analytics Tracking ───
            function trackChallengeEvent(eventType, eventData){
                if(!BOOT.ajax || !BOOT.ajax.url) return;
                fetch(BOOT.ajax.url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({
                        action: 'gstore_track_challenge',
                        product_id: cur.productId,
                        event_type: eventType,
                        event_data: JSON.stringify(eventData || {})
                    })
                }).catch(function(e){ console.log('Analytics track failed:', e); });
            }

            function startChallenge(){ console.log('🎮 Starting challenge'); trackChallengeEvent('challenge_started', {product_title: cur.title}); setShowChallenge(true); setChallengeScreen('intro'); setChallengeLevel(1); setChallengeScore(0); setMathTries(MATH_MAX_TRIES); setMathInput(''); setMathFeedback(''); initStockfish(); }
            function closeChallenge(){ console.log('❌ Closing challenge'); if(challengeScreen !== 'intro' && !challengeUnlocked) trackChallengeEvent('challenge_abandoned', {screen: challengeScreen}); setShowChallenge(false); setChallengeScreen(null); }
            function startFlappyGame(){ setChallengeScreen('game'); setGameRunning(true); setChallengeScore(0); setBirdY(200); setVelocity(0); setPipes([]); }
            function jumpBird(){ if (!gameRunning) return; setVelocity(-7); }

            // Chess game with chess.js + Stockfish AI
            function initChess(){
                console.log('🔍 Attempting to initialize chess...');
                if(typeof window.Chess === 'undefined'){
                    console.error('❌ Chess.js not available. Waiting...');
                    setTimeout(function(){ initChess(); }, 500); // Retry after 500ms
                    return;
                }
                console.log('✅ Chess.js found, creating instance...');
                chessInstanceRef.current = new window.Chess();
                console.log('✅ Chess instance created:', chessInstanceRef.current);

                // Initialize board from starting position
                updateBoardFromFEN(chessInstanceRef.current.fen());

                // Initialize game state
                setChessGame({turn:'white',moves:0,gameOver:false,winner:null,selectedSquare:null,message:''});
                console.log('♟️ Chess initialized successfully!');
            }
            function updateBoardFromFEN(fen){
                var parts = fen.split(' ');
                var rows = parts[0].split('/');
                var board = [];
                for(var i=0; i<8; i++){
                    var row = [];
                    var chars = rows[i];
                    for(var j=0; j<chars.length; j++){
                        var c = chars[j];
                        if(c >= '1' && c <= '8'){
                            var empty = parseInt(c);
                            for(var k=0; k<empty; k++) row.push(null);
                        } else {
                            var color = (c === c.toUpperCase()) ? 'white' : 'black';
                            var piece = c.toLowerCase();
                            row.push({piece:piece, color:color});
                        }
                    }
                    board.push(row);
                }
                setChessBoard(board);
            }

            // Convert row/col to algebraic notation (e.g., e2, e4)
            function toAlgebraic(row, col){
                return String.fromCharCode(97 + col) + (8 - row);
            }

            function makeAIMove(callback){
                var chessInstance = chessInstanceRef.current;
                if(!chessInstance) return callback(null);

                if(stockfishReady && stockfishEngine){
                    pendingStockfishMove = function(move){
                        var result = chessInstance.move({from: move.from, to: move.to, promotion: 'q'});
                        if(result){
                            updateBoardFromFEN(chessInstance.fen());
                            callback(result);
                        } else {
                            callback(null);
                        }
                    };
                    stockfishEngine.postMessage('position fen ' + chessInstance.fen());
                    stockfishEngine.postMessage('go depth ' + CHESS_DIFFICULTY);
                } else {
                    // Fallback: random legal move from chess.js
                    var moves = chessInstance.moves({verbose: true});
                    if(moves.length === 0) return callback(null);
                    var move = moves[Math.floor(Math.random() * moves.length)];
                    chessInstance.move(move);
                    updateBoardFromFEN(chessInstance.fen());
                    callback(move);
                }
            }

            function handleChessClick(row,col){
                var chessInstance = chessInstanceRef.current;
                console.log('👆 Chess click:', {row:row, col:col, chessGame:chessGame, hasInstance:!!chessInstance});
                if(!chessGame || chessGame.gameOver || chessGame.turn!=='white' || !chessInstance){
                    console.log('⚠️ Click blocked:', {hasGame:!!chessGame, gameOver:chessGame?.gameOver, turn:chessGame?.turn, hasInstance:!!chessInstance});
                    return;
                }

                if(chessGame.selectedSquare === null){
                    var piece = chessBoard[row][col];
                    if(piece && piece.color === 'white'){
                        setChessGame({...chessGame, selectedSquare:{row:row,col:col}});
                    }
                } else {
                    var from = toAlgebraic(chessGame.selectedSquare.row, chessGame.selectedSquare.col);
                    var to = toAlgebraic(row, col);

                    var move = chessInstance.move({from: from, to: to, promotion: 'q'});

                    if(move){
                        updateBoardFromFEN(chessInstance.fen());

                        if(chessInstance.in_checkmate()){
                            setChessGame({...chessGame, gameOver:true, winner:'white', selectedSquare:null, message:'✅ You won!'});
                            setTimeout(function(){ setChallengeScreen('math'); }, 2000);
                            return;
                        }

                        setChessGame({...chessGame, turn:'black', selectedSquare:null, moves:chessGame.moves+1});

                        setTimeout(function(){
                            makeAIMove(function(aiMove){
                                if(!aiMove || chessInstance.in_checkmate()){
                                    setChessGame(function(prev){return {...prev, gameOver:true, winner:'white', message:'✅ You won!'};});
                                    setTimeout(function(){ setChallengeScreen('math'); }, 2000);
                                    return;
                                }

                                if(chessInstance.in_checkmate()){
                                    trackChallengeEvent('level2_failed', {moves: chessGame.moves});
                                    setChessGame(function(prev){return {...prev, gameOver:true, winner:'black', turn:'white', message:'❌ AI won! Try again.'};});
                                    return;
                                }

                                setChessGame(function(prev){return {...prev, turn:'white', moves:prev.moves+1};});
                            });
                        }, 500);
                    } else {
                        setChessGame({...chessGame, selectedSquare:null});
                    }
                }
            }
            function handleMathSubmit(){ var correctAnswer=parseFloat(BOOT.challenge.math_answer||'42'); var userAnswer=parseFloat(mathInput); if(userAnswer===correctAnswer){ trackChallengeEvent('level3_completed', {tries_used: (MATH_MAX_TRIES - mathTries + 1)}); trackChallengeEvent('challenge_completed', {total_time: Date.now()}); setMathFeedback('✅ '+CHALLENGE_TEXTS.congratulations); setTimeout(function(){ setChallengeUnlocked(true); setShowChallenge(false); setTier('80-85'); },2000); }else{ if(mathTries>1){ setMathTries(mathTries-1); setMathFeedback('❌ არასწორია! შენ გაქვს '+(mathTries-1)+' მცდელობა'); }else{ trackChallengeEvent('level3_failed', {tries_used: MATH_MAX_TRIES}); setMathFeedback('❌ მცდელობები ამოიწურა!'); setTimeout(function(){ setShowChallenge(false); setChallengeScreen('intro'); },2000); } } }

            // ─────────────────────────────────────────────────────────────────────────────
            // [HELPERS] CALCULATION & UI HELPER FUNCTIONS (Lines 1084-1280)
            // Pricing, comparison, filtering, and UI component helpers
            // ─────────────────────────────────────────────────────────────────────────────

            function ScoreBar(score, better){
                var width = Math.max(5, Math.min(100, score * 10));
                var color = better ? "bg-green-500" : "bg-red-400";
                return e("div",{className:"flex items-center"},[
                    e("div",{key:"bar",className:"h-1 rounded-full "+color,style:{width:width+'%'}}),
                    e("span",{key:"val",className:"ml-2 text-[10px] text-gray-600"},score)
                ]);
            }

            function CompareRow(name, enabled){
                var l = currentSpecs[name] || 0;
                var r = compareSpecs[name] || 0;

                if (!enabled) {
                    return e("div",{className:"mb-3"},[
                        e("div",{className:"text-xs text-gray-500"},name)
                    ]);
                }

                var leftBetter = l >= r;
                var rightBetter = r > l;

                return e("div",{className:"mb-3"},[
                    e("div",{key:"label",className:"text-xs text-gray-500 mb-1"},name),
                    e("div",{key:"bars",className:"grid grid-cols-2 gap-3 items-center"},[
                        ScoreBar(l, leftBetter),
                        ScoreBar(r, rightBetter)
                    ])
                ]);
            }

            var scoreKeys = ['CPU','GPU','Camera','Battery','Display','Build','Connectivity','Charging','Weight','Durability','Storage Speed','Thermals'];

// OPTIMIZED: Icons organized in single object for better maintainability
            var Icons = {
                Truck: function(){ return e("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},[e("path",{key:1,d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}),e("path",{key:2,d:"M15 18H9"}),e("path",{key:3,d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"}),e("circle",{key:4,cx:17,cy:18,r:2}),e("circle",{key:5,cx:7,cy:18,r:2})]); },
                Shield: function(){ return e("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},[e("path",{key:1,d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})]); },
                Warehouse: function(){ return e("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},[e("path",{key:1,d:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}),e("polyline",{key:2,points:"9 22 9 12 15 12 15 22"})]); },
                Info: function(){ return e("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},[e("path",{key:1,d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}),e("line",{key:2,x1:12,x2:12,y1:16,y2:12}),e("line",{key:3,x1:12,x2:12.01,y1:8,y2:8})]); },
                Cart: function(){ return e("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},[e("circle",{key:1,cx:9,cy:21,r:1}),e("circle",{key:2,cx:20,cy:21,r:1}),e("path",{key:3,d:"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"})]); },
                Coins: function(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-green-600"},[e("circle",{key:1,cx:8,cy:8,r:6}),e("path",{key:2,d:"M18.09 10.37A6 6 0 1 1 10.34 18"}),e("path",{key:3,d:"M7 6h1v4"}),e("path",{key:4,d:"m16.71 13.88.7.71-2.82 2.82"})]); }
            };
// Backward compatibility aliases
            var TruckIcon = Icons.Truck;
            var ShieldIcon = Icons.Shield;
            var WarehouseIcon = Icons.Warehouse;
            var InfoIcon = Icons.Info;
            var CartIcon = Icons.Cart;
            var CoinsIcon = Icons.Coins;

// Get shipping time and warehouse from BOOT
            var shippingTime = BOOT.shippingTime || '2–3 business days';
            var warehouse = BOOT.warehouse || '';

            // Get condition text
            var conditionNewText = t('condition_new', 'NEW');
            var conditionUsedText = t('condition_used', 'USED (A)');
            var currentConditionText = cond === 'new' ? conditionNewText : conditionUsedText;

            // Detect mobile (<=1024px)
            var _s18 = useState(typeof window !== 'undefined' && window.innerWidth <= 1024);
            var isMobile = _s18[0]; var setIsMobile = _s18[1];

            useEffect(function(){
                var handleResize = function(){
                    setIsMobile(window.innerWidth <= 1024);
                };
                window.addEventListener('resize', handleResize);
                return function(){ window.removeEventListener('resize', handleResize); };
            }, []);

            // Create sticky bar outside Shadow DOM for mobile
            useEffect(function(){
                if (!isMobile) {
                    // Remove sticky bar if exists
                    var existingBar = document.getElementById('gstore-mobile-sticky-bar');
                    if (existingBar) existingBar.remove();
                    return;
                }

                // Create sticky bar in regular DOM
                var stickyBar = document.getElementById('gstore-mobile-sticky-bar');
                if (!stickyBar) {
                    stickyBar = document.createElement('div');
                    stickyBar.id = 'gstore-mobile-sticky-bar';
                    document.body.appendChild(stickyBar);
                }

                // Style the sticky bar - find .wd-toolbar footer
                var bottomNav = document.querySelector('.wd-toolbar');
                var footerHeight = bottomNav ? bottomNav.offsetHeight : 60;
                // Use z-index 99 to stay below side menu, cart, and navigation
                stickyBar.style.cssText = 'position:fixed;bottom:' + footerHeight + 'px;left:0;right:0;background:white;border-top:1px solid #e5e7eb;padding:0.625rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;z-index:99;box-shadow:0 -2px 10px rgba(0,0,0,0.1)';

                // Render content
                var pricesDiv = document.createElement('div');
                pricesDiv.style.cssText = 'flex:1;display:flex;align-items:center;gap:0.5rem';

                var mainSpan = document.createElement('span');
                mainSpan.style.cssText = 'font-size:1.125rem;font-weight:700;color:' + (priceBlock.hasSale ? '#dc2626' : '#2563eb');
                mainSpan.textContent = (priceBlock.hasSale ? '🔥 ' : '') + gel(priceBlock.hasSale ? priceBlock.sale : priceBlock.base);
                pricesDiv.appendChild(mainSpan);

                if (priceBlock.hasSale) {
                    var regSpan = document.createElement('span');
                    regSpan.style.cssText = 'font-size:0.875rem;color:#9ca3af;text-decoration:line-through';
                    regSpan.textContent = gel(priceBlock.reg);
                    pricesDiv.appendChild(regSpan);
                }

                var cartBtn = document.createElement('button');
                cartBtn.style.cssText = 'background:#16a34a;color:white;font-weight:500;padding:0.75rem 1rem;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;gap:0.25rem;border:none;cursor:pointer';
                cartBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
                cartBtn.onclick = function(){ addToCart(null); };

                var buyBtn = document.createElement('button');
                buyBtn.className = 'buy-now-btn';
                buyBtn.style.cssText = 'background:white;border:2px solid #2563eb;color:#2563eb;font-weight:500;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer;position:relative;overflow:hidden';
                buyBtn.textContent = t('buy_now', 'Buy Now');
                buyBtn.onclick = function(ev){
                    var btn = ev.currentTarget;
                    btn.classList.add('animate');
                    setTimeout(function(){ if(btn) btn.classList.remove('animate'); }, 600);
                    addToCart('/checkout/');
                };

                stickyBar.innerHTML = '';
                stickyBar.appendChild(pricesDiv);
                stickyBar.appendChild(cartBtn);
                stickyBar.appendChild(buyBtn);

                return function(){
                    var bar = document.getElementById('gstore-mobile-sticky-bar');
                    if (bar) bar.remove();
                };
            }, [isMobile, priceBlock, gel, t, addToCart]);

            // Desktop sticky bar - show when scrolled past original CTA buttons
            var _s19 = useState(false);
            var showDesktopSticky = _s19[0]; var setShowDesktopSticky = _s19[1];

            useEffect(function(){
                if (isMobile) {
                    setShowDesktopSticky(false);
                    return;
                }

                // Observe the CTA section in desktop layout
                var observer = new IntersectionObserver(function(entries){
                    entries.forEach(function(entry){
                        // Show sticky bar when CTA is NOT visible
                        setShowDesktopSticky(!entry.isIntersecting);
                    });
                }, {threshold: 0});

                // OPTIMIZED: Wait for DOM with timeout to prevent infinite interval
                var checkInterval = setInterval(function(){
                    var host = document.getElementById('gstore-epp-shadow-host');
                    var ctaSection = null;
                    if (host && host.shadowRoot) {
                        ctaSection = host.shadowRoot.querySelector('[data-gstore-cta]');
                    }
                    if (ctaSection) {
                        observer.observe(ctaSection);
                        clearInterval(checkInterval);
                    }
                }, 100);

                // Safety timeout: stop checking after 5 seconds
                var safetyTimeout = setTimeout(function(){
                    clearInterval(checkInterval);
                }, 5000);

                return function(){
                    observer.disconnect();
                    clearInterval(checkInterval);
                    clearTimeout(safetyTimeout);
                };
            }, [isMobile]);

            // Create desktop sticky bar
            useEffect(function(){
                if (isMobile || !showDesktopSticky) {
                    var existingBar = document.getElementById('gstore-desktop-sticky-bar');
                    if (existingBar) existingBar.remove();
                    return;
                }

                var stickyBar = document.getElementById('gstore-desktop-sticky-bar');
                if (!stickyBar) {
                    stickyBar = document.createElement('div');
                    stickyBar.id = 'gstore-desktop-sticky-bar';
                    document.body.appendChild(stickyBar);
                }

                // Find sticky header row and account for WordPress admin bar
                var header = document.querySelector('.whb-sticky-row') || document.querySelector('.whb-general-header') || document.querySelector('header');
                var headerHeight = header ? header.offsetHeight : 0;
                var adminBar = document.getElementById('wpadminbar');
                var adminBarHeight = adminBar ? adminBar.offsetHeight : 0;
                var totalTopOffset = headerHeight + adminBarHeight;

                // Stick directly below header (accounting for admin bar) with z-index 99 to stay below cart, search, and navigation
                stickyBar.style.cssText = 'position:fixed;top:' + totalTopOffset + 'px;left:0;right:0;background:white;border-bottom:1px solid #e5e7eb;padding:1rem 2rem;display:flex;align-items:center;justify-content:center;gap:1rem;z-index:99;box-shadow:0 2px 10px rgba(0,0,0,0.1)';

                var container = document.createElement('div');
                container.style.cssText = 'max-width:80rem;width:100%;display:flex;align-items:center;justify-content:space-between;gap:2rem';

                // Left section: Prices + Product name (swapped order)
                var leftSection = document.createElement('div');
                leftSection.style.cssText = 'display:flex;align-items:center;gap:1.5rem';

                var pricesDiv = document.createElement('div');
                pricesDiv.style.cssText = 'display:flex;align-items:center;gap:1rem';
                if (priceBlock.hasSale) {
                    var regSpan = document.createElement('span');
                    regSpan.style.cssText = 'font-size:1rem;color:#9ca3af;text-decoration:line-through';
                    regSpan.textContent = gel(priceBlock.reg);
                    pricesDiv.appendChild(regSpan);
                }
                var mainSpan = document.createElement('span');
                mainSpan.style.cssText = 'font-size:1.5rem;font-weight:700;color:' + (priceBlock.hasSale ? '#dc2626' : '#2563eb');
                mainSpan.textContent = gel(priceBlock.hasSale ? priceBlock.sale : priceBlock.base);
                pricesDiv.appendChild(mainSpan);
                leftSection.appendChild(pricesDiv);

                // Product name (after prices)
                var productName = document.createElement('div');
                productName.style.cssText = 'font-size:1.125rem;font-weight:600;color:#111827;max-width:20rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
                productName.textContent = cur.title || BOOT.title || 'Product';
                leftSection.appendChild(productName);

                var buttonsDiv = document.createElement('div');
                buttonsDiv.style.cssText = 'display:flex;gap:0.75rem';

                var cartBtn = document.createElement('button');
                cartBtn.style.cssText = 'background:#2563eb;color:white;font-weight:500;padding:0.75rem 2rem;border-radius:0.5rem;border:none;cursor:pointer;font-size:1rem';
                cartBtn.textContent = t('add_to_cart', 'Add to Cart') + ' ' + gel(grandTotal);
                cartBtn.onclick = function(){ addToCart(null); };

                var buyBtn = document.createElement('button');
                buyBtn.className = 'buy-now-btn';
                buyBtn.style.cssText = 'background:white;border:2px solid #d1d5db;color:#374151;font-weight:500;padding:0.75rem 2rem;border-radius:0.5rem;cursor:pointer;font-size:1rem;position:relative;overflow:hidden';
                buyBtn.textContent = t('buy_now', 'Buy Now') + ' ' + gel(grandTotal);
                buyBtn.onclick = function(ev){
                    var btn = ev.currentTarget;
                    btn.classList.add('animate');
                    setTimeout(function(){ if(btn) btn.classList.remove('animate'); }, 600);
                    addToCart('/checkout/');
                };

                buttonsDiv.appendChild(cartBtn);
                buttonsDiv.appendChild(buyBtn);

                container.appendChild(leftSection);
                container.appendChild(buttonsDiv);

                stickyBar.innerHTML = '';
                stickyBar.appendChild(container);

                return function(){
                    var bar = document.getElementById('gstore-desktop-sticky-bar');
                    if (bar) bar.remove();
                };
            }, [isMobile, showDesktopSticky, priceBlock, grandTotal, gel, t, addToCart]);

            // P4 OPTIMIZED: Show loading skeleton while data loads
            if (isLoading) {
                return e(LoadingSkeleton);
            }

            // ═════════════════════════════════════════════════════════════════════════════
            // [MOBILE] MOBILE LAYOUT (Lines 1896-2150) - Viewport <1024px
            // Single column: Title → Image → Swatches → Info → Selectors → CTA
            // ═════════════════════════════════════════════════════════════════════════════

            if (isMobile) {
                console.log('🔍 DEBUG - Mobile Layout:', {
                    deviceType: cur.deviceType,
                    brand: cur.brand,
                    storage: cur.storage,
                    condition: cond,
                    availableStorages: Object.keys(storages),
                    shouldShowColors: cur.deviceType !== 'laptop'
                });

                return e("div",{className:"min-h-screen bg-white pb-24"},[
                    e("div",{key:"mobile-content",className:"py-2 space-y-3"},[
                        // 1. Title
                        e("h1",{key:"title",className:"text-lg font-semibold"},
                            cur.title || BOOT.title || "Product"),

                        // 2. Hero image + gallery thumbnails + color selectors (colors hidden for laptops)
                        e("div",{key:"image-section",className:"space-y-2"},[
                            // Hero image with overlaid vertical gallery (left side, fit to image height)
                            e("div",{key:"hero-gallery",className:"relative",style:{width:'100%'}},[
                                // Hero image (full width)
                                e("img",{
                                    key:"hero",
                                    src:heroImage,
                                    alt:cur.title||"Product",
                                    className:"w-full rounded-lg object-cover",
                                    onLoad:function(ev){ setHeroImageHeight(ev.target.offsetHeight); }
                                }),
                                // Gallery thumbnails (overlaid vertically on left side, centered Y-axis)
                                hasGallery && e("div",{key:"gallery",className:"absolute flex flex-col justify-center",style:{top:'50%',left:'8px',transform:'translateY(-50%)'}},[
                                    // Scroll up button (always visible, grayed when disabled)
                                    e("button",{
                                        key:"scroll-up",
                                        className:"flex items-center justify-center rounded text-xs transition-colors "+(galleryScroll > 0 ? "text-gray-700 hover:bg-white hover:bg-opacity-90" : "text-gray-300 cursor-not-allowed"),
                                        style:{width:'32px',height:'20px',padding:'2px 0',backgroundColor:'transparent',marginBottom:'4px'},
                                        disabled:galleryScroll === 0,
                                        onClick:function(){ if(galleryScroll > 0) setGalleryScroll(Math.max(0, galleryScroll - 1)); }
                                    }, "↑"),
                                    // Thumbnails container
                                    e("div",{key:"thumbs",className:"flex flex-col gap-1"},
                                        gallery.slice(galleryScroll, galleryScroll + visibleGalleryCount).map(function(img, idx){
                                            var actualIdx = galleryScroll + idx;
                                            return e("img",{
                                                key:actualIdx,
                                                src:img,
                                                alt:"Gallery "+actualIdx,
                                                className:"rounded-md object-cover cursor-pointer border-2 "+(heroImage===img?"border-blue-600":"border-white"),
                                                style:{width:'32px',height:'32px',backgroundColor:'white'},
                                                onClick:function(){ setHeroImage(img); }
                                            });
                                        })
                                    ),
                                    // Scroll down button (always visible, grayed when disabled)
                                    e("button",{
                                        key:"scroll-down",
                                        className:"flex items-center justify-center rounded text-xs transition-colors "+(galleryScroll < maxScroll ? "text-gray-700 hover:bg-white hover:bg-opacity-90" : "text-gray-300 cursor-not-allowed"),
                                        style:{width:'32px',height:'20px',padding:'2px 0',backgroundColor:'transparent',marginTop:'4px'},
                                        disabled:galleryScroll >= maxScroll,
                                        onClick:function(){ if(galleryScroll < maxScroll) setGalleryScroll(Math.min(maxScroll, galleryScroll + 1)); }
                                    }, "↓")
                                ])
                            ]),
                            cur.deviceType !== 'laptop' && e("div",{key:"colors",className:"flex gap-2 justify-center flex-wrap"},
                                colors.map(function(c){
                                    var active = (String(c.id)===String(cur.productId));
                                    return e("img",{
                                        key:c.id,
                                        src:c.image,
                                        alt:c.color||'color',
                                        className:"h-16 w-16 rounded-lg object-cover cursor-pointer border-2",
                                        style:{borderColor:active ? (c.hex || '#333') : '#d1d5db',borderStyle:'solid'},
                                        onClick:function(){ switchToProductId(c.id); }
                                    });
                                })
                            )
                        ]),

                        // 3. Info grid (shipping/warehouse/condition/warranty)
                        e("div",{key:"info",className:"grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-lg"},[
                            e("div",{key:"ship",className:"flex items-center gap-2"},[
                                e(TruckIcon),
                                e("span",{},shippingTime)
                            ]),
                            e("div",{key:"warehouse",className:"flex items-center gap-2"},[
                                e(WarehouseIcon),
                                e("span",{},warehouse || t('warehouse_mobile_fallback', 'Tbilisi'))
                            ]),
                            e("div",{key:"cond",className:"flex items-center gap-2"},[
                                e(InfoIcon),
                                e("span",{},currentConditionText)
                            ]),
                            e("div",{key:"warr",className:"flex items-center gap-2"},[
                                e(ShieldIcon),
                                e("button",{
                                    className:"text-blue-600 underline bg-transparent border-0 p-0",
                                    onClick:function(){ setShowWarrantyModal(true); }
                                }, t('warranty_text', 'Warranty'))
                            ])
                        ]),

                        // 4. Storage - hide unavailable options and entire section for laptops
                        (function(){
                            var availStorages = ALL_STORAGES.filter(function(st){ return storages[st]; });
                            if (availStorages.length === 0) return null;
                            return e("div",{key:"storage"},[
                                e("h3",{className:"text-sm font-semibold mb-2"},t('storage_options_text', 'Storage')),
                                e("div",{className:"flex",style:{gap:'0.5rem',justifyContent:'center'}},
                                    availStorages.map(function(st){
                                        var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                        return e("button",{
                                            key:st,
                                            className:(active?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700")+" text-center py-2 text-sm font-medium border border-gray-200 rounded-lg",
                                            style:{width:'60px'},
                                            onClick:function(){ switchStorage(st); }
                                        }, st);
                                    })
                                )
                            ]);
                        })(),

                        // 5. Condition + Battery Tiers - fixed sizing for up to 3 options
                        e("div",{key:"condition"},[
                            e("h3",{className:"text-sm font-semibold mb-2 text-center"},t('condition_label', 'Condition')),
                            e("div",{key:"condition",className:"flex mb-2",style:{gap:'0.5rem',justifyContent:'center'}},[
                                e("button",{
                                    key:"new",
                                    className:"text-center py-2 text-sm font-medium border border-gray-200 rounded-lg "+(cond==='new'?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700"),
                                    style:{width:'90px'},
                                    onClick:function(){ setTier(null); setNewBat(false); setCond('new'); }
                                }, conditionNewText),
                                avail.hasUsed && e("button",{
                                    key:"used",
                                    className:"text-center py-2 text-sm font-medium border border-gray-200 rounded-lg "+(cond==='used'?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700"),
                                    style:{width:'90px'},
                                    onClick:function(){ setTier(null); setNewBat(false); setCond('used'); }
                                }, conditionUsedText)
                            ]),
                            cond==='used' && shouldShowBatteryTier(cur.deviceType, cur.brand) && rules && rules.exists &&
                            e("div",{className:"flex rounded-lg overflow-hidden"},
                                USED_TIERS.map(function(t, idx){
                                    var pr = rules.pricing || {};
                                    var row = pr[t] || {};
                                    var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                    var active = (tier===t);
                                    var reg = parseFloat(row.regular||0);
                                    var sale = parseFloat(row.sale||0);
                                    var hasSale = (sale > 0 && sale < reg);
                                    // Only show lock if tier has pricing AND user hasn't unlocked it
                                    var isLocked = (t === '80-85' && enabled && !challengeUnlocked);
                                    var cls = "flex-1 text-center py-2 text-xs font-medium border border-gray-200 ";
                                    if (idx === 0) cls += "rounded-l-lg ";
                                    if (idx === USED_TIERS.length - 1) cls += "rounded-r-lg ";
                                    if (active) cls += "bg-green-600 text-white border-green-600";
                                    else if (enabled && !isLocked) cls += "bg-white text-gray-700";
                                    else if (isLocked) cls += "bg-blue-50 text-blue-600 border-blue-200 cursor-pointer hover:bg-blue-100";
                                    else cls += "bg-gray-100 text-gray-400";
                                    return e("button",{
                                        key:t,
                                        className:cls,
                                        disabled:!enabled,
                                        onClick:function(){ if(!enabled)return; if(isLocked){startChallenge();}else{setTier(t);} }
                                    }, (isLocked ? "🔒 " : (hasSale ? "🔥 " : "")) + t + '%');
                                })
                            )
                        ]),

                        // 6. Add New Battery
                        cond==='used' && shouldShowBatteryTier(cur.deviceType, cur.brand) && rules && rules.exists && (function(){
                            var nb = (rules.pricing||{})['new_battery']||{};
                            var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                            if (!hasPrice) return null;
                            return e("button",{
                                key:"newbat",
                                className:"w-full py-2 px-4 rounded-lg border text-sm font-medium " + (newBat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"),
                                onClick:function(){ setNewBat(!newBat); },
                                'aria-pressed': newBat,
                                'aria-label': newBat ? 'Remove new battery' : 'Add new battery'
                            }, [
                                newBat ? "✓ " : "+ ",
                                batteryPriceBlock.hasSale && e("span",{key:"sale-badge",className:"text-red-600"},"🔥 "),
                                "Battery (",
                                batteryPriceBlock.hasSale && e("span",{key:"reg",className:"line-through text-gray-400"},"+₾"+Math.floor(batteryPriceBlock.regular)+" "),
                                "+₾"+Math.floor(batteryPrice),
                                ")"
                            ]);
                        })(),

                        // 6b. Laptop Add-ons (Mobile)
                        cur.deviceType === 'laptop' && laptopAddons.length > 0 && laptopAddons.map(function(addon){
                            var isSelected = selectedAddons.indexOf(addon.key) >= 0;
                            return e("button",{
                                    key:addon.key,
                                    className:"w-full py-2 px-4 rounded-lg border text-sm font-medium mb-2 " + (isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"),
                                    onClick:function(){ toggleAddon(addon.key); }
                                }, isSelected
                                    ? "✓ " + addon.label + " (+" + gel(addon.price) + ")"
                                    : "+ " + addon.label + " (+" + gel(addon.price) + ")"
                            );
                        }),

                        // 7. Short Description
                        BOOT.shortDescription && e("div",{key:"desc",className:"text-gray-700 text-sm leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-3"},[
                            e("div",{dangerouslySetInnerHTML:{__html:BOOT.shortDescription}})
                        ]),

                        // 8. Tabs (Specs/Delivery/Compare)
                        e("div",{key:"tabs"},[
                            e("div",{className:"bg-gray-100 p-1 rounded-lg flex gap-1 mb-3",role:"tablist"},
                                [['specifications', t('specifications_tab', 'Specs')],
                                    ['delivery', t('delivery_tab', 'Delivery')],
                                    ['compare', t('compare_tab', 'Compare')]].map(function(tab){
                                    var active = activeTab===tab[0];
                                    var cls = "flex-1 text-center py-2 text-sm font-medium rounded-md "+(active?"bg-white text-gray-900 shadow-sm":"text-gray-600");
                                    return e("button",{
                                        key:tab[0],
                                        className:cls,
                                        onClick:function(){ setActiveTab(active ? null : tab[0]); },
                                        role:"tab",
                                        'aria-selected':active,
                                        'aria-controls':tab[0]+'-panel',
                                        'aria-label':tab[1]+' tab'
                                    }, tab[1]);
                                })
                            ),
                            activeTab && e("div",{className:"pt-2 text-sm text-gray-700"},[
                                activeTab==='specifications' && (BOOT.description
                                    ? e("div",{dangerouslySetInnerHTML:{__html:BOOT.description}})
                                    : e("p",{},"No specs available.")),
                                activeTab==='delivery' && (deliveryText
                                    ? e("div",{dangerouslySetInnerHTML:{__html:deliveryText}})
                                    : e("p",{},"Loading...")),
                                activeTab==='compare' && e("div",{className:"space-y-3"},[
                                    // Compare product selector
                                    !compareProduct ?
                                        e("button",{
                                            className:"w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm",
                                            onClick:function(){ setShowSearch(true); }
                                        }, t('add_to_compare', '+ Add Product to Compare'))
                                        :
                                        e("div",{className:"flex items-center justify-between p-2 bg-gray-50 rounded-lg"},[
                                            e("span",{key:"name",className:"text-sm"},"Product #"+compareProduct),
                                            e("button",{
                                                key:"change",
                                                className:"px-2 py-1 text-xs border border-gray-300 rounded bg-white",
                                                onClick:function(){ setCompareProduct(null); }
                                            },"Change")
                                        ]),
                                    // Search dropdown
                                    showSearch && e("div",{className:"bg-white shadow-lg border rounded-lg p-3"},[
                                        e("div",{key:"search",className:"flex items-center border rounded-lg px-2 mb-2"},[
                                            e("span",{key:"icon"},"🔍"),
                                            e("input",{
                                                key:"input",
                                                type:"text",
                                                className:"flex-1 text-sm p-1 outline-none",
                                                placeholder:"Search products...",
                                                value:searchQuery,
                                                onChange:function(ev){ setSearchQuery(ev.target.value); }
                                            })
                                        ]),
                                        e("ul",{key:"results",className:"max-h-40 overflow-y-auto"},
                                            searchResults.length > 0 ?
                                                searchResults.map(function(p){
                                                    return e("li",{
                                                        key:p.id,
                                                        className:"p-2 hover:bg-blue-50 cursor-pointer rounded text-sm",
                                                        onClick:function(){
                                                            setCompareProduct(p.id);
                                                            setShowSearch(false);
                                                            setSearchQuery('');
                                                        }
                                                    }, p.title);
                                                })
                                                :
                                                e("li",{className:"p-2 text-xs text-gray-400 text-center"},"No products found")
                                        )
                                    ]),
                                    // Comparison table
                                    compareProduct && e("div",{className:"space-y-1"},
                                        scoreKeys.map(function(k){ return CompareRow(k, true); })
                                    )
                                ])
                            ])
                        ]),

                        // 9. FBT - Frequently Bought Together
                        fbt.length>0 && e("div",{key:"fbt",className:"border border-gray-200 rounded-lg p-2"},[
                            e("h3",{key:"title",className:"text-sm font-semibold mb-2"},t('fbt_title', 'Frequently Bought Together')),
                            e("div",{key:"flex",className:"flex gap-2 justify-between"},
                                fbt.map(function(item){
                                    var isSelected = selectedFBT.indexOf(item.id) >= 0;
                                    var truncatedTitle = item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title;
                                    return e("div",{
                                        key:item.id,
                                        className:"flex-1 flex flex-col border rounded-lg p-1.5 text-center "+(isSelected?"border-blue-500 bg-blue-50":"border-gray-200")
                                    },[
                                        e("img",{
                                            key:"img",
                                            src:item.image,
                                            alt:item.title,
                                            className:"w-full h-14 object-contain rounded mb-1"
                                        }),
                                        e("p",{key:"name",className:"font-medium text-[10px] mb-1 leading-tight"},truncatedTitle),
                                        e("button",{
                                            key:"btn",
                                            className:"w-full text-[11px] py-0.5 rounded border mt-auto "+(isSelected?"bg-blue-600 text-white":"bg-white text-gray-700"),
                                            onClick:function(){ toggleFBT(item.id); }
                                        }, isSelected ? "✓ "+gel(item.price) : "+ "+gel(item.price))
                                    ]);
                                })
                            )
                        ])
                    ]),

                    // Sticky bar is rendered outside Shadow DOM via useEffect above

                    // Warranty Modal (shared)
                    showWarrantyModal && e("div",{key:"warranty-modal",className:"fixed inset-0 z-50 flex items-center justify-center pt-16",onClick:function(){ setShowWarrantyModal(false); },onWheel:handleModalWrapperScroll},[e("div",{key:"modal",className:"relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col overflow-hidden",style:{maxHeight:"85vh",paddingTop:"20px"},onClick:function(ev){ ev.stopPropagation(); }},[e("div",{key:"header",className:"flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0"},[e("h2",{key:"title",className:"text-xl font-semibold text-gray-900"},"Warranty Information"),e("button",{key:"close",className:"text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0",onClick:function(){ setShowWarrantyModal(false); }},[e("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-6 w-6",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},[e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})])])]),e("div",{key:"content",ref:modalContentRef,className:"p-6 text-gray-700 overflow-y-auto flex-1 text-center",dangerouslySetInnerHTML:{__html: BOOT.warrantyContent || '<p>No warranty information available.</p>'}})])]),

                    // Battery Tier Challenge Modal
                    (showChallenge === true && challengeScreen !== null) && e("div",{key:"challenge-modal",className:"fixed inset-0 z-[999] flex items-center justify-center p-4",style:{background:'transparent',animation:'fadeIn 0.2s ease-out',paddingTop:'80px'},onClick:function(){if(challengeScreen==='intro')closeChallenge();}},[
                        challengeScreen==='intro' && e("div",{key:"intro",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"relative p-6 border-b border-gray-200 rounded-t-lg"},[e("button",{key:"close",className:"absolute top-4 right-4 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg p-1.5 transition-colors",onClick:closeChallenge},e("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24"},[e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})])),e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🏆"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.intro_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc1",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc1(cur.title)),e("p",{key:"desc2",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc2),e("p",{key:"desc3",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc3)]),e("div",{key:"footer",className:"flex items-center gap-3 p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"start",className:"flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:startFlappyGame},CHALLENGE_TEXTS.start_btn),e("button",{key:"cancel",className:"text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10",onClick:closeChallenge},CHALLENGE_TEXTS.close_btn)])
                        ]),
                        challengeScreen==='game' && e("div",{key:"game",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'450px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🐦"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},"Flappy Gstore")])]),e("div",{key:"game-area",className:"relative overflow-hidden",style:{width:'100%',height:'500px',background:'linear-gradient(to bottom, #7dd3fc, #38bdf8)',cursor:'pointer'},onClick:jumpBird},[e("img",{key:"bird",src:'https://gstore.ge/wp-content/uploads/2025/11/logo-mark.webp',alt:"Flappy Gstore",className:"absolute",style:{left:'60px',width:'40px',height:'40px',objectFit:'contain',top:birdY+'px'}}),pipes.map(function(p,i){return e("div",{key:i},[e("div",{key:"top",className:"absolute",style:{width:'40px',height:(p.gapY-100)+'px',left:p.x+'px',top:0,background:'#1f2937',borderRadius:'0 0 8px 8px'}}),e("div",{key:"bottom",className:"absolute",style:{width:'40px',height:(500-(p.gapY+100))+'px',left:p.x+'px',top:(p.gapY+100)+'px',background:'#1f2937',borderRadius:'8px 8px 0 0'}})]);}),e("div",{key:"score",className:"absolute top-4 left-4 text-lg font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg"},CHALLENGE_TEXTS.score+": "+Math.floor(challengeScore))])]),
                        challengeScreen==='lose' && e("div",{key:"lose",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"💥"),e("h3",{key:"title",className:"text-2xl font-bold text-red-600"},CHALLENGE_TEXTS.lose_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.lose_desc)]),e("div",{key:"footer",className:"flex items-center gap-3 p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"retry",className:"flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:startFlappyGame},CHALLENGE_TEXTS.try_again),e("button",{key:"close",className:"text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10",onClick:function(){setShowChallenge(false);setChallengeScreen('intro');}},CHALLENGE_TEXTS.close_btn)])
                        ]),
                        challengeScreen==='level2' && e("div",{key:"level2",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🎉"),e("h3",{key:"title",className:"text-2xl font-bold text-green-600"},CHALLENGE_TEXTS.level2_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc1",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.level2_desc1),e("p",{key:"desc2",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.level2_desc2)]),e("div",{key:"footer",className:"flex items-center p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"continue",className:"w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:function(){setChallengeScreen('chess');initChess();}},CHALLENGE_TEXTS.continue_btn)])
                        ]),
                        challengeScreen==='chess' && chessGame && chessBoard.length > 0 && e("div",{key:"chess",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'650px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"♟️"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.chess_title)])]),e("div",{key:"body",className:"p-6"},[e("div",{key:"status",className:"flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg"},[e("p",{key:"turn",className:"text-sm font-medium text-gray-700"},chessGame&&chessGame.gameOver ? chessGame.message : (chessGame&&chessGame.turn==='white' ? '👉 Your turn' : '🤖 AI is thinking...')),e("p",{key:"moves",className:"text-sm text-gray-500"},"Moves: "+(chessGame?chessGame.moves:0))]),e("div",{key:"board",className:"grid gap-0 mb-4 mx-auto rounded-lg overflow-hidden shadow-md",style:{gridTemplateColumns:'repeat(8, 1fr)',width:'100%',maxWidth:'500px',aspectRatio:'1'}},chessBoard.flatMap(function(row,i){return row.map(function(cell,j){var isLight=(i+j)%2===0;var isSelected=chessGame&&chessGame.selectedSquare&&chessGame.selectedSquare.row===i&&chessGame.selectedSquare.col===j;var bgColor=isSelected?'#baca44':(isLight?'#f0d9b5':'#b58863');return e("div",{key:i+'-'+j,className:"flex items-center justify-center text-3xl cursor-pointer transition-colors hover:opacity-80",style:{background:bgColor,aspectRatio:'1',border:isSelected?'3px solid #769656':'none',fontWeight:'bold'},onClick:function(){handleChessClick(i,j);}},cell?(cell.color==='white'?'♙♘♗♖♕♔'.charAt('pnbrqk'.indexOf(cell.piece)):'♟♞♝♜♛♚'.charAt('pnbrqk'.indexOf(cell.piece))):'');});})),chessGame&&!chessGame.gameOver && e("p",{key:"hint",className:"text-xs text-center text-gray-500"},"Click your piece, then click where to move it. Capture the King to win!")])
                        ]),
                        challengeScreen==='math' && e("div",{key:"math",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🧮"),e("h3",{key:"title",className:"text-2xl font-bold text-purple-600"},CHALLENGE_TEXTS.math_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"tries",className:"text-sm text-gray-500"},CHALLENGE_TEXTS.math_tries(mathTries)),e("p",{key:"question",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.math_question),e("input",{key:"input",type:"number",value:mathInput,onChange:function(ev){setMathInput(ev.target.value);},className:"bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-center",placeholder:"შეიყვანე პასუხი"}),mathFeedback && e("p",{key:"feedback",className:"text-sm text-center text-gray-600"},mathFeedback)]),e("div",{key:"footer",className:"flex items-center p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"submit",className:"w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:handleMathSubmit},CHALLENGE_TEXTS.submit_btn)])
                        ])
                    ])
                ]);
            }

            // ═════════════════════════════════════════════════════════════════════════════
            // [DESKTOP] DESKTOP LAYOUT (Lines 1281-1895) - Viewport ≥1024px
            // Two-column grid: Left (gallery, description, tabs) | Right (selectors, CTA)
            // ═════════════════════════════════════════════════════════════════════════════

            return e("div",{className:"min-h-screen bg-white"},[
                e("div",{key:"main",className:"max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8"},[
                    // LEFT: Photos + Description + Tabs
                    e("div",{key:"left",className:"space-y-6"},[
                        // Hero image with overlaid vertical gallery (left side, fit to image height)
                        e("div",{key:"hero-gallery",className:"relative",style:{width:'100%'}},[
                            // Hero image (full width)
                            e("img",{
                                key:"hero",
                                src:heroImage,
                                alt:cur.title||"Product",
                                className:"w-full rounded-2xl shadow-md object-cover",
                                onLoad:function(ev){ setHeroImageHeight(ev.target.offsetHeight); }
                            }),
                            // Gallery thumbnails (overlaid vertically on left side, centered Y-axis)
                            hasGallery && e("div",{key:"gallery",className:"absolute flex flex-col justify-center",style:{top:'50%',left:'16px',transform:'translateY(-50%)'}},[
                                // Scroll up button (always visible, grayed when disabled)
                                e("button",{
                                    key:"scroll-up",
                                    className:"flex items-center justify-center rounded-lg text-sm font-semibold transition-colors "+(galleryScroll > 0 ? "text-gray-700 hover:bg-white hover:bg-opacity-90" : "text-gray-300 cursor-not-allowed"),
                                    style:{width:'60px',height:'28px',padding:'4px 0',backgroundColor:'transparent',marginBottom:'8px'},
                                    disabled:galleryScroll === 0,
                                    onClick:function(){ if(galleryScroll > 0) setGalleryScroll(Math.max(0, galleryScroll - 1)); }
                                }, "↑"),
                                // Thumbnails container
                                e("div",{key:"thumbs",className:"flex flex-col gap-2"},
                                    gallery.slice(galleryScroll, galleryScroll + visibleGalleryCount).map(function(img, idx){
                                        var actualIdx = galleryScroll + idx;
                                        return e("img",{
                                            key:actualIdx,
                                            src:img,
                                            alt:"Gallery "+actualIdx,
                                            className:"rounded-lg object-cover cursor-pointer border-2 "+(heroImage===img?"border-blue-600":"border-white"),
                                            style:{width:'60px',height:'60px',backgroundColor:'white'},
                                            onClick:function(){ setHeroImage(img); }
                                        });
                                    })
                                ),
                                // Scroll down button (always visible, grayed when disabled)
                                e("button",{
                                    key:"scroll-down",
                                    className:"flex items-center justify-center rounded-lg text-sm font-semibold transition-colors "+(galleryScroll < maxScroll ? "text-gray-700 hover:bg-white hover:bg-opacity-90" : "text-gray-300 cursor-not-allowed"),
                                    style:{width:'60px',height:'28px',padding:'4px 0',backgroundColor:'transparent',marginTop:'8px'},
                                    disabled:galleryScroll >= maxScroll,
                                    onClick:function(){ if(galleryScroll < maxScroll) setGalleryScroll(Math.min(maxScroll, galleryScroll + 1)); }
                                }, "↓")
                            ])
                        ]),

                        // Color thumbnail row (hidden for laptops)
                        cur.deviceType !== 'laptop' && e("div",{key:"thumbs",className:"flex gap-3 overflow-x-auto"},
                            colors.map(function(c){
                                var active = (String(c.id)===String(cur.productId));
                                return e("img",{
                                    key:c.id,
                                    src:c.image,
                                    alt:c.color||'color',
                                    className:"h-16 w-16 rounded-lg object-cover cursor-pointer border-2",
                                    style:{borderColor:active ? (c.hex || '#333') : '#e5e7eb',borderStyle:'solid'},
                                    onClick:function(){ switchToProductId(c.id); }
                                });
                            })
                        ),

                        // Short Description from WooCommerce
                        BOOT.shortDescription && e("div",{key:"desc",className:"text-gray-700 text-sm leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-4"},[
                            e("div",{dangerouslySetInnerHTML:{__html:BOOT.shortDescription}})
                        ]),

                        // Tabs
                        e("div",{key:"tabs"},[
                            e("div",{className:"bg-gray-100 p-1 rounded-lg flex gap-1 mb-4"},[
                                [
                                    ['specifications', t('specifications_tab', 'Specifications')],
                                    ['delivery', t('delivery_tab', 'Delivery')],
                                    ['compare', t('compare_tab', 'Compare')]
                                ]
                            ].map(function(tabs){
                                return tabs.map(function(tab){
                                    var active = activeTab===tab[0];
                                    var cls = "flex-1 text-center py-2 px-2 text-sm font-medium rounded-md cursor-pointer transition-all "+(active?"bg-white text-gray-900 shadow-sm":"text-gray-600 hover:text-gray-900");
                                    return e("button",{key:tab[0],className:cls,onClick:function(){ if (typeof window!=='undefined' && window.innerWidth<=768 && activeTab===tab[0]) { setActiveTab(null); } else { setActiveTab(tab[0]); } }}, tab[1]);
                                });
                            })),

                            // Tab content
                            e("div",{className:"pt-4"},[
                                activeTab==='specifications' && e("div",{key:"specs",className:"text-sm text-gray-700 leading-relaxed"},[
                                    BOOT.description
                                        ? e("div",{dangerouslySetInnerHTML:{__html:BOOT.description}})
                                        : e("p",{},"No specifications available.")
                                ]),

                                activeTab==='delivery' && e("div",{key:"delivery",className:"text-sm text-gray-700"},[
                                    deliveryText
                                        ? e("div",{dangerouslySetInnerHTML:{__html:deliveryText}})
                                        : e("p",{},"Loading delivery information...")
                                ]),

                                activeTab==='compare' && e("div",{key:"compare",className:"grid grid-cols-2 gap-8"},[
                                    // Left: Current product
                                    e("div",{key:"left"},[
                                        e("h3",{className:"font-semibold mb-2"},"iPhone 14 Pro"),
                                        scoreKeys.map(function(k){ return CompareRow(k, !!compareProduct); })
                                    ]),

                                    // Right: Compare selector
                                    e("div",{key:"right",className:"relative"},[
                                        compareProduct ?
                                            e("div",{},[
                                                e("div",{className:"flex items-center justify-between mb-2"},[
                                                    e("h3",{key:"title",className:"font-semibold"},"Product #"+compareProduct),
                                                    e("button",{
                                                        key:"change",
                                                        className:"px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50",
                                                        onClick:function(){ setCompareProduct(null); }
                                                    },"Change")
                                                ]),
                                                scoreKeys.map(function(k){ return CompareRow(k, true); })
                                            ])
                                            :
                                            e("button",{
                                                className:"w-full border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex flex-col items-center gap-2",
                                                onClick:function(){ setShowSearch(true); }
                                            },[
                                                e("span",{key:"icon",className:"text-2xl"},"⊕"),
                                                e("span",{key:"label",className:"font-semibold"},t('add_to_compare', 'Add Product to Compare'))
                                            ]),

                                        // Search dropdown
                                        showSearch && e("div",{
                                            className:"absolute right-0 top-0 bg-white shadow-lg border rounded-lg p-4 w-64 z-50"
                                        },[
                                            e("div",{key:"search",className:"flex items-center border rounded-lg px-2 mb-2"},[
                                                e("span",{key:"icon",className:"text-gray-400"},"🔍"),
                                                e("input",{
                                                    key:"input",
                                                    type:"text",
                                                    className:"flex-1 text-sm p-1 outline-none",
                                                    placeholder:"Search products...",
                                                    value:searchQuery,
                                                    onChange:function(ev){ setSearchQuery(ev.target.value); }
                                                })
                                            ]),
                                            e("ul",{key:"results",className:"max-h-56 overflow-y-auto"},
                                                searchResults.length > 0 ?
                                                    searchResults.map(function(p){
                                                        return e("li",{
                                                            key:p.id,
                                                            className:"p-2 hover:bg-blue-50 cursor-pointer rounded-md",
                                                            onClick:function(){
                                                                setCompareProduct(p.id);
                                                                setShowSearch(false);
                                                                setSearchQuery('');
                                                            }
                                                        }, p.title);
                                                    })
                                                    :
                                                    e("li",{className:"p-2 text-xs text-gray-400 text-center"},"No products found")
                                            )
                                        ])
                                    ])
                                ])
                            ])
                        ])
                    ]),

                    // RIGHT: Price + Info + Selectors + FBT
                    e("div",{key:"right",className:"space-y-5"},[
                        // Title
                        e("h1",{key:"title",className:"text-2xl font-semibold"},
                            cur.title || BOOT.title || "Product"),
                        e("hr",{key:"hr",className:"my-4 border-t border-gray-300"}),

                        // Price
                        e("div",{key:"price",className:"flex items-center gap-3 flex-wrap"},[
                            e("div",{key:"prices",className:"flex items-center gap-2"},[
                                e("span",{key:"main",className:"text-3xl font-bold " + (priceBlock.hasSale ? "text-red-600" : "text-gray-900")},
                                    (priceBlock.hasSale ? "🔥 " : "") + gel(priceBlock.hasSale ? priceBlock.sale : priceBlock.base)),
                                priceBlock.hasSale && e("span",{key:"reg",className:"text-sm text-gray-400 line-through"}, gel(priceBlock.reg))
                            ]),
                            e("p",{key:"inst",className:"text-gray-600 flex items-center gap-1 text-base"},[
                                e(CoinsIcon,{key:"icon"}),
                                " " + t('installment_text', 'From ₾{amount}/month for 24 months', {
                                    amount: Math.floor(grandTotal/24)
                                })
                            ])
                        ]),

                        // Info grid - with translations
                        e("div",{key:"info",className:"grid grid-cols-2 gap-4 text-sm text-gray-700 mt-2"},[
                            e("div",{key:"ship",className:"flex items-center gap-2"},[
                                e(TruckIcon),
                                " " + t('shipping_text', 'Shipping: {time}', {time: shippingTime}).replace('{time}', shippingTime)
                            ]),
                            e("div",{key:"warr",className:"flex items-center gap-2"},[
                                e(ShieldIcon),
                                e("button",{
                                    className:"text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-0 p-0",
                                    onClick:function(){ setShowWarrantyModal(true); }
                                }, t('warranty_text', 'Warranty: Available'))
                            ]),
                            e("div",{key:"warehouse",className:"flex items-center gap-2"},[
                                e(WarehouseIcon),
                                " " + (warehouse
                                    ? t('warehouse_text', 'Warehouse: {location}', {location: warehouse}).replace('{location}', warehouse)
                                    : t('warehouse_fallback', 'Warehouse: Tbilisi'))
                            ]),
                            e("div",{key:"cond",className:"flex items-center gap-2"},[
                                e(InfoIcon),
                                " " + t('condition_text', 'Condition: {condition}', {condition: currentConditionText})
                            ])
                        ]),

                        // Storage - hide unavailable options and entire section for laptops
                        (function(){
                            var availStorages = ALL_STORAGES.filter(function(st){ return storages[st]; });
                            if (availStorages.length === 0) return null;
                            return e("div",{key:"storage",className:"mt-4"},[
                                e("h3",{className:"text-sm font-semibold mb-2"},t('storage_options_text', 'Storage Options')),
                                e("div",{className:"flex",style:{gap:'0.5rem'}},
                                    availStorages.map(function(st){
                                        var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                        return e("button",{
                                            key:st,
                                            className:(active?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700")+" text-center py-2 text-sm font-medium border border-gray-200 rounded-lg",
                                            style:{width:'70px'},
                                            onClick:function(){ switchStorage(st); }
                                        }, st);
                                    })
                                )
                            ]);
                        })(),

                        // Condition + Battery Tier
                        e("div",{key:"condition",className:"mt-4"},[
                            e("h3",{className:"text-sm font-semibold mb-2"},t('condition_label', 'Condition')),
                            e("div",{className:"flex gap-2 mb-3"},[
                                CondButton(conditionNewText,'new', avail.hasNew),
                                CondButton(conditionUsedText,'used', avail.hasUsed)
                            ]),

                            cond==='used' && shouldShowBatteryTier(cur.deviceType, cur.brand) && rules && rules.exists &&
                            e("div",{},[                                e("div",{key:"tiers",className:"flex rounded-lg overflow-hidden"},
                                USED_TIERS.map(function(t, idx){
                                    var pr = rules.pricing || {};
                                    var row = pr[t] || {};
                                    var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                    var active = (tier===t);
                                    var reg = parseFloat(row.regular||0);
                                    var sale = parseFloat(row.sale||0);
                                    var hasSale = (sale > 0 && sale < reg);
                                    // Only show lock if tier has pricing AND user hasn't unlocked it
                                    var isLocked = (t === '80-85' && enabled && !challengeUnlocked);
                                    var cls = "flex-1 text-center py-2 text-sm font-medium transition-all border border-gray-200 ";
                                    if (idx === 0) cls += "rounded-l-lg ";
                                    if (idx === USED_TIERS.length - 1) cls += "rounded-r-lg ";
                                    if (active) cls += "bg-green-600 text-white border-green-600";
                                    else if (enabled && !isLocked) cls += "bg-white text-gray-700 hover:bg-green-50 cursor-pointer";
                                    else if (isLocked) cls += "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 cursor-pointer";
                                    else cls += "bg-gray-100 text-gray-400 cursor-not-allowed";

                                    return e("button",{
                                        key:t,
                                        className:cls,
                                        disabled:!enabled,
                                        onClick:function(){ if(!enabled)return; if(isLocked){startChallenge();}else{setTier(t);} }
                                    }, (isLocked ? "🔒 " : (hasSale ? "🔥 " : "")) + t + '%');
                                })
                            ),

                                // NEW BATTERY - with translation
                                (function(){
                                    var nb = (rules.pricing||{})['new_battery']||{};
                                    var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                    if (!hasPrice) return null;

                                    return e("div",{key:"newbat",className:"mt-3",style:{position:'relative'}},[
                                        e("button",{
                                            className:"w-full py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (newBat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                            style:{paddingRight:newBat?'50px':'1rem'},
                                            onClick:function(){ setNewBat(!newBat); }
                                        }, [
                                            newBat ? "✓ " : "+ ",
                                            batteryPriceBlock.hasSale && e("span",{key:"sale-badge",className:"text-red-600"},"🔥 "),
                                            newBat ? "New Battery Added (" : "Add New Battery (",
                                            batteryPriceBlock.hasSale && e("span",{key:"reg",className:"line-through text-gray-400"},"+₾"+Math.floor(batteryPriceBlock.regular)+" "),
                                            "+₾"+Math.floor(batteryPrice),
                                            ")"
                                        ]),
                                        newBat && e("button",{
                                            key:"remove",
                                            className:"remove-btn",
                                            onClick:function(ev){ ev.stopPropagation(); setNewBat(false); }
                                        },[
                                            e("span",{key:"sign",className:"remove-sign"},e("svg",{viewBox:"0 0 16 16",height:"16",width:"16",xmlns:"http://www.w3.org/2000/svg"},e("path",{d:"M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"}))),
                                            e("span",{key:"text",className:"remove-text"},"Remove")
                                        ])
                                    ]);
                                })()
                            ])
                        ]),

                        // Laptop Add-ons (RAM/Storage) - Desktop
                        cur.deviceType === 'laptop' && laptopAddons.length > 0 && e("div",{key:"laptop-addons",className:"mt-3",style:{display:'flex',flexWrap:'wrap',gap:'0.5rem'}},
                            laptopAddons.map(function(addon){
                                var isSelected = selectedAddons.indexOf(addon.key) >= 0;
                                return e("div",{
                                    key:addon.key,
                                    style:{flex:'1 1 0',position:'relative'}
                                },[
                                    e("button",{
                                            key:"btn",
                                            className:"w-full py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                            style:{paddingRight:isSelected?'50px':'1rem'},
                                            onClick:function(){ toggleAddon(addon.key); }
                                        }, isSelected
                                            ? "✓ " + addon.label + " (+" + gel(addon.price) + ")"
                                            : "+ " + addon.label + " (+" + gel(addon.price) + ")"
                                    ),
                                    isSelected && e("button",{
                                        key:"remove",
                                        className:"remove-btn",
                                        onClick:function(ev){ ev.stopPropagation(); toggleAddon(addon.key); }
                                    },[
                                        e("span",{key:"sign",className:"remove-sign"},e("svg",{viewBox:"0 0 16 16",height:"16",width:"16",xmlns:"http://www.w3.org/2000/svg"},e("path",{d:"M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"}))),
                                        e("span",{key:"text",className:"remove-text"},"Remove")
                                    ])
                                ]);
                            })
                        ),

                        // CTAs - with translations
                        e("div",{key:"cta",className:"flex gap-3 mt-6","data-gstore-cta": "true"},[
                            e("button",{
                                key:"cart",
                                className:"flex-1 cart-btn-desktop bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2",
                                onClick:function(){ addToCart(null); }
                            },[
                                e("span",{key:"icon-container",className:"cart-icon-container"},e(CartIcon)),
                                e("span",{key:"text",className:"cart-text"}," " + t('add_to_cart', 'Add to Cart') + " " + gel(grandTotal))
                            ]),
                            e("button",{
                                key:"buy",
                                className:"flex-1 buy-now-btn bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg",
                                onClick:function(ev){
                                    var btn = ev.currentTarget;
                                    btn.classList.add('animate');
                                    setTimeout(function(){ if(btn) btn.classList.remove('animate'); }, 600);
                                    addToCart('/checkout/');
                                }
                            }, t('buy_now', 'Buy Now') + " " + gel(grandTotal))
                        ]),

                        // FBT - with translations
                        fbt.length>0 && e("div",{key:"fbt",className:"mt-6"},[
                            e("h3",{key:"title",className:"text-base font-semibold mb-4"},t('fbt_title', 'Frequently Bought Together')),
                            e("div",{key:"grid",className:"grid sm:grid-cols-3 gap-4"},
                                fbt.map(function(item){
                                    var isSelected = selectedFBT.indexOf(item.id) >= 0;
                                    return e("div",{
                                        key:item.id,
                                        className:"fbt-card "+(isSelected?"fbt-card-selected":"")
                                    },[
                                        e("div",{key:"shine",className:"fbt-card__shine"}),
                                        e("div",{key:"glow",className:"fbt-card__glow"}),
                                        isSelected && e("div",{key:"badge",className:"fbt-card__badge"},"✓ Added"),
                                        e("div",{key:"content",className:"fbt-card__content"},[
                                            e("div",{
                                                key:"img-wrap",
                                                className:"fbt-card__image",
                                                style:{backgroundImage:'url('+item.image+')',backgroundSize:'contain',backgroundRepeat:'no-repeat',backgroundPosition:'center'}
                                            }),
                                            e("div",{key:"text",className:"fbt-card__text"},[
                                                e("h4",{key:"title",className:"fbt-card__title"},item.title)
                                            ]),
                                            e("div",{key:"footer",className:"fbt-card__footer"},[
                                                e("span",{key:"price",className:"fbt-card__price"},"₾"+item.price),
                                                e("button",{
                                                    key:"btn",
                                                    className:"fbt-card__button",
                                                    onClick:function(){ toggleFBT(item.id); }
                                                },e("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3"},isSelected?e("path",{d:"M5 13l4 4L19 7"}):[
                                                    e("line",{key:"h",x1:"12",y1:"5",x2:"12",y2:"19"}),
                                                    e("line",{key:"v",x1:"5",y1:"12",x2:"19",y2:"12"})
                                                ]))
                                            ])
                                        ])
                                    ]);
                                })
                            )
                        ])
                    ]),

                    // Warranty Modal
                    showWarrantyModal && e("div",{key:"warranty-modal",className:"fixed inset-0 z-50 flex items-center justify-center pt-16",onClick:function(){ setShowWarrantyModal(false); },onWheel:handleModalWrapperScroll},[e("div",{key:"modal",className:"relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col overflow-hidden",style:{maxHeight:"85vh",paddingTop:"20px"},onClick:function(ev){ ev.stopPropagation(); }},[e("div",{key:"header",className:"flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0"},[e("h2",{key:"title",className:"text-xl font-semibold text-gray-900"},"Warranty Information"),e("button",{key:"close",className:"text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0",onClick:function(){ setShowWarrantyModal(false); }},[e("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-6 w-6",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},[e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})])])]),e("div",{key:"content",ref:modalContentRef,className:"p-6 text-gray-700 overflow-y-auto flex-1 text-center",dangerouslySetInnerHTML:{__html: BOOT.warrantyContent || '<p>No warranty information available.</p>'}})])]),

                    // Battery Tier Challenge Modal (Desktop)
                    (showChallenge === true && challengeScreen !== null) && e("div",{key:"challenge-modal",className:"pointer-events-none fixed inset-0 z-[999] flex items-center justify-center transition-opacity duration-300",onClick:function(){if(challengeScreen==='intro')closeChallenge();}},[
                        challengeScreen==='intro' && e("div",{key:"intro",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"relative p-6 border-b border-gray-200 rounded-t-lg"},[e("button",{key:"close",className:"absolute top-4 right-4 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg p-1.5 transition-colors",onClick:closeChallenge},e("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24"},[e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})])),e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🏆"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.intro_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc1",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc1(cur.title)),e("p",{key:"desc2",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc2),e("p",{key:"desc3",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.intro_desc3)]),e("div",{key:"footer",className:"flex items-center gap-3 p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"start",className:"flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:startFlappyGame},CHALLENGE_TEXTS.start_btn),e("button",{key:"cancel",className:"text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10",onClick:closeChallenge},CHALLENGE_TEXTS.close_btn)])
                        ]),
                        challengeScreen==='game' && e("div",{key:"game",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'450px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🐦"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},"Flappy Gstore")])]),e("div",{key:"game-area",className:"relative overflow-hidden",style:{width:'100%',height:'500px',background:'linear-gradient(to bottom, #7dd3fc, #38bdf8)',cursor:'pointer'},onClick:jumpBird},[e("img",{key:"bird",src:'https://gstore.ge/wp-content/uploads/2025/11/logo-mark.webp',alt:"Flappy Gstore",className:"absolute",style:{left:'60px',width:'40px',height:'40px',objectFit:'contain',top:birdY+'px'}}),pipes.map(function(p,i){return e("div",{key:i},[e("div",{key:"top",className:"absolute",style:{width:'40px',height:(p.gapY-100)+'px',left:p.x+'px',top:0,background:'#1f2937',borderRadius:'0 0 8px 8px'}}),e("div",{key:"bottom",className:"absolute",style:{width:'40px',height:(500-(p.gapY+100))+'px',left:p.x+'px',top:(p.gapY+100)+'px',background:'#1f2937',borderRadius:'8px 8px 0 0'}})]);}),e("div",{key:"score",className:"absolute top-4 left-4 text-lg font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg"},CHALLENGE_TEXTS.score+": "+Math.floor(challengeScore))])]),
                        challengeScreen==='lose' && e("div",{key:"lose",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"💥"),e("h3",{key:"title",className:"text-2xl font-bold text-red-600"},CHALLENGE_TEXTS.lose_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.lose_desc)]),e("div",{key:"footer",className:"flex items-center gap-3 p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"retry",className:"flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:startFlappyGame},CHALLENGE_TEXTS.try_again),e("button",{key:"close",className:"text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10",onClick:function(){setShowChallenge(false);setChallengeScreen('intro');}},CHALLENGE_TEXTS.close_btn)])
                        ]),
                        challengeScreen==='level2' && e("div",{key:"level2",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🎉"),e("h3",{key:"title",className:"text-2xl font-bold text-green-600"},CHALLENGE_TEXTS.level2_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"desc1",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.level2_desc1),e("p",{key:"desc2",className:"text-base leading-relaxed text-gray-600"},CHALLENGE_TEXTS.level2_desc2)]),e("div",{key:"footer",className:"flex items-center p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"continue",className:"w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:function(){setChallengeScreen('chess');initChess();}},CHALLENGE_TEXTS.continue_btn)])
                        ]),
                        challengeScreen==='chess' && chessGame && chessBoard.length > 0 && e("div",{key:"chess",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'650px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"♟️"),e("h3",{key:"title",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.chess_title)])]),e("div",{key:"body",className:"p-6"},[e("div",{key:"status",className:"flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg"},[e("p",{key:"turn",className:"text-sm font-medium text-gray-700"},chessGame&&chessGame.gameOver ? chessGame.message : (chessGame&&chessGame.turn==='white' ? '👉 Your turn' : '🤖 AI is thinking...')),e("p",{key:"moves",className:"text-sm text-gray-500"},"Moves: "+(chessGame?chessGame.moves:0))]),e("div",{key:"board",className:"grid gap-0 mb-4 mx-auto rounded-lg overflow-hidden shadow-md",style:{gridTemplateColumns:'repeat(8, 1fr)',width:'100%',maxWidth:'500px',aspectRatio:'1'}},chessBoard.flatMap(function(row,i){return row.map(function(cell,j){var isLight=(i+j)%2===0;var isSelected=chessGame&&chessGame.selectedSquare&&chessGame.selectedSquare.row===i&&chessGame.selectedSquare.col===j;var bgColor=isSelected?'#baca44':(isLight?'#f0d9b5':'#b58863');return e("div",{key:i+'-'+j,className:"flex items-center justify-center text-3xl cursor-pointer transition-colors hover:opacity-80",style:{background:bgColor,aspectRatio:'1',border:isSelected?'3px solid #769656':'none',fontWeight:'bold'},onClick:function(){handleChessClick(i,j);}},cell?(cell.color==='white'?'♙♘♗♖♕♔'.charAt('pnbrqk'.indexOf(cell.piece)):'♟♞♝♜♛♚'.charAt('pnbrqk'.indexOf(cell.piece))):'');});})),chessGame&&!chessGame.gameOver && e("p",{key:"hint",className:"text-xs text-center text-gray-500"},"Click your piece, then click where to move it. Capture the King to win!")])
                        ]),
                        challengeScreen==='math' && e("div",{key:"math",className:"pointer-events-auto w-full rounded-lg bg-white shadow-xl border border-gray-200",style:{maxWidth:'512px',animation:'slideUp 0.3s ease-out'},onClick:function(ev){ev.stopPropagation();}},[
                            e("div",{key:"header",className:"p-6 border-b border-gray-200 rounded-t-lg"},[e("div",{key:"title-wrapper",className:"text-center"},[e("div",{key:"icon",className:"text-5xl mb-3"},"🧮"),e("h3",{key:"title",className:"text-2xl font-bold text-purple-600"},CHALLENGE_TEXTS.math_title)])]),e("div",{key:"body",className:"p-6 space-y-6 text-center"},[e("p",{key:"tries",className:"text-sm text-gray-500"},CHALLENGE_TEXTS.math_tries(mathTries)),e("p",{key:"question",className:"text-2xl font-bold text-gray-900"},CHALLENGE_TEXTS.math_question),e("input",{key:"input",type:"number",value:mathInput,onChange:function(ev){setMathInput(ev.target.value);},className:"bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-center",placeholder:"შეიყვანე პასუხი"}),mathFeedback && e("p",{key:"feedback",className:"text-sm text-center text-gray-600"},mathFeedback)]),e("div",{key:"footer",className:"flex items-center p-6 border-t border-gray-200 rounded-b-lg"},[e("button",{key:"submit",className:"w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center",onClick:handleMathSubmit},CHALLENGE_TEXTS.submit_btn)])
                        ])
                    ])
                ])
            ]);
        }

        var host = document.getElementById('gstore-epp-shadow-host');
        if (!host){
            console.error('Host not found');
            return;
        }

        try {
            var shadow = host.shadowRoot || host.attachShadow({mode:'open'});

            var style = document.createElement('style');
            style.textContent = `*,:before,:after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}:before,:after{--tw-content:""}html,:host{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;line-height:inherit}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,[type=button],[type=reset],[type=submit]{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}textarea{resize:vertical}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=button]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}*,:before,:after{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000}::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000}.mx-auto{margin-left:auto;margin-right:auto}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}.mb-4{margin-bottom:1rem}.ml-2{margin-left:.5rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.my-4{margin-top:1rem;margin-bottom:1rem}.flex{display:flex}.grid{display:grid}.h-1{height:.25rem}.h-16{height:4rem}.h-24{height:6rem}.h-4{height:1rem}.min-h-\\[2\\.5rem\\]{min-height:2.5rem}.min-h-screen{min-height:100vh}.w-16{width:4rem}.w-4{width:1rem}.w-64{width:16rem}.w-full{width:100%}.max-w-7xl{max-width:80rem}.flex-1{flex:1 1 0%}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.list-disc{list-style-type:disc}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-between{justify-between}.justify-center{justify-content:center}.gap-1{gap:.25rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-8{gap:2rem}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.25rem * var(--tw-space-y-reverse))}.space-y-5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.25rem * var(--tw-space-y-reverse))}.space-y-6>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.5rem * var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.rounded-2xl{border-radius:1rem}.border{border-width:1px}.border-2{border-width:2px}.border-dashed{border-style:dashed}.border-blue-500{--tw-border-opacity:1;border-color:rgb(59 130 246/var(--tw-border-opacity))}.border-blue-600{--tw-border-opacity:1;border-color:rgb(37 99 235/var(--tw-border-opacity))}.border-gray-100{--tw-border-opacity:1;border-color:rgb(243 244 246/var(--tw-border-opacity))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235/var(--tw-border-opacity))}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219/var(--tw-border-opacity))}.bg-blue-100{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.bg-blue-50{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.bg-blue-600{--tw-bg-opacity:1;background-color:rgb(37 99 235/var(--tw-bg-opacity))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity))}.bg-green-50{--tw-bg-opacity:1;background-color:rgb(240 253 244/var(--tw-bg-opacity))}.bg-green-600{--tw-bg-opacity:1;background-color:rgb(22 163 74/var(--tw-bg-opacity))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity))}.object-contain{object-fit:contain}.object-cover{object-fit:cover}.p-1{padding:.25rem}.p-10{padding:2.5rem}.p-2{padding:.5rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.pl-5{padding-left:1.25rem}.pt-4{padding-top:1rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-\\[10px\\]{font-size:10px}.text-\\[12px\\]{font-size:12px}.text-base{font-size:1rem;line-height:1.5rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.leading-relaxed{line-height:1.625}.text-blue-600{--tw-text-opacity:1;color:rgb(37 99 235/var(--tw-text-opacity))}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128/var(--tw-text-opacity))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}.text-green-600{--tw-text-opacity:1;color:rgb(22 163 74/var(--tw-text-opacity))}.text-red-400{--tw-text-opacity:1;color:rgb(248 113 113/var(--tw-text-opacity))}.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.line-through{text-decoration-line:line-through}.shadow{--tw-shadow:0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgb(0 0 0/.1),0 4px 6px -4px rgb(0 0 0/.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px rgb(0 0 0/.1),0 2px 4px -2px rgb(0 0 0/.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgb(0 0 0/.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.outline-none{outline:2px solid transparent;outline-offset:2px}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.accent-green-600{accent-color:#16a34a}.hover\\:bg-blue-100:hover{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.hover\\:bg-blue-50:hover{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.hover\\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.hover\\:bg-gray-50:hover{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity))}.hover\\:bg-green-50:hover{--tw-bg-opacity:1;background-color:rgb(240 253 244/var(--tw-bg-opacity))}.hover\\:border-blue-400:hover{--tw-border-opacity:1;border-color:rgb(96 165 250/var(--tw-border-opacity))}.hover\\:text-blue-600:hover{--tw-text-opacity:1;color:rgb(37 99 235/var(--tw-text-opacity))}.hover\\:text-gray-900:hover{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}@media(min-width:640px){.sm\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1024px){.lg\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
            shadow.appendChild(style);

            // P4 OPTIMIZED: Add missing CSS classes including loading animation and custom min-width classes
            var extraStyle = document.createElement('style');
            extraStyle.textContent = `.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{top:0;right:0;bottom:0;left:0}.left-0{left:0}.right-0{right:0}.bottom-0{bottom:0}.z-50{z-index:50}.border-t{border-top-width:1px}.border-b{border-bottom-width:1px}.bg-opacity-40{--tw-bg-opacity:0.4}.bg-opacity-50{--tw-bg-opacity:0.5}.bg-black{--tw-bg-opacity:1;background-color:rgb(0 0 0/var(--tw-bg-opacity))}.bg-gray-400{--tw-bg-opacity:1;background-color:rgb(156 163 175/var(--tw-bg-opacity))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(229 231 235/var(--tw-bg-opacity))}.max-w-2xl{max-width:42rem}.mx-4{margin-left:1rem;margin-right:1rem}.max-h-\[70vh\]{max-height:70vh}.h-6{height:1.5rem}.h-8{height:2rem}.h-14{height:3.5rem}.h-64{height:16rem}.w-6{width:1.5rem}.w-10{width:2.5rem}.w-3\/4{width:75%}.w-1\/2{width:50%}.w-5\/6{width:83.333333%}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-\[7px\]{font-size:7px}.text-\[8px\]{font-size:8px}.text-\[10px\]{font-size:10px}.text-\[11px\]{font-size:11px}.underline{text-decoration-line:underline}.bg-transparent{background-color:transparent}.border-0{border-width:0}.border-2{border-width:2px}.flex-shrink-0{flex-shrink:0}.flex-1{flex:1 1 0%}.flex-col{flex-direction:column}.p-1\.5{padding:0.375rem}.p-2\.5{padding:0.625rem}.p-3{padding:0.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-0\.5{padding-top:0.125rem;padding-bottom:0.125rem}.py-3{padding-top:0.75rem;padding-bottom:0.75rem}.pb-24{padding-bottom:6rem}.mb-1{margin-bottom:0.25rem}.mt-auto{margin-top:auto}.leading-tight{line-height:1.25}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(0.5rem * var(--tw-space-y-reverse))}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(0.75rem * var(--tw-space-y-reverse))}.space-y-4>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1rem * var(--tw-space-y-reverse))}.hover\:text-blue-800:hover{--tw-text-opacity:1;color:rgb(30 64 175/var(--tw-text-opacity))}.hover\:text-gray-600:hover{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.hover\:bg-green-700:hover{--tw-bg-opacity:1;background-color:rgb(21 128 61/var(--tw-bg-opacity))}.hover\:bg-blue-50:hover{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.hover\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.shadow-xl{--tw-shadow:0 20px 25px -5px rgb(0 0 0/.1),0 8px 10px -6px rgb(0 0 0/.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.animate-pulse{animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}.min-w-\[60px\]{min-width:60px!important}.min-w-\[70px\]{min-width:70px!important}.min-w-\[80px\]{min-width:80px!important}.buy-now-btn{position:relative;overflow:hidden;transition:all 0.2s ease}.buy-now-btn:active{transform:scale(0.96)}.buy-now-btn:before,.buy-now-btn:after{position:absolute;content:"";width:150%;left:50%;height:100%;transform:translateX(-50%);z-index:0;background-repeat:no-repeat}.buy-now-btn.animate:before{top:-70%;background-image:radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 20%,#2563eb 20%,transparent 30%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 10%,#2563eb 15%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%);background-size:10% 10%,20% 20%,15% 15%,20% 20%,18% 18%,10% 10%,15% 15%,10% 10%,18% 18%;animation:topBubbles 0.6s ease}.buy-now-btn.animate:after{bottom:-70%;background-image:radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 10%,#2563eb 15%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%);background-size:15% 15%,20% 20%,18% 18%,20% 20%,15% 15%,20% 20%,18% 18%;animation:bottomBubbles 0.6s ease}@media(min-width:1025px){.buy-now-btn:hover:before{top:-70%;background-image:radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 20%,#2563eb 20%,transparent 30%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 10%,#2563eb 15%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%);background-size:10% 10%,20% 20%,15% 15%,20% 20%,18% 18%,10% 10%,15% 15%,10% 10%,18% 18%;animation:topBubbles 0.6s ease}.buy-now-btn:hover:after{bottom:-70%;background-image:radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,transparent 10%,#2563eb 15%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%),radial-gradient(circle,#2563eb 20%,transparent 20%);background-size:15% 15%,20% 20%,18% 18%,20% 20%,15% 15%,20% 20%,18% 18%;animation:bottomBubbles 0.6s ease}}@keyframes topBubbles{0%{background-position:5% 90%,10% 90%,10% 90%,15% 90%,25% 90%,25% 90%,40% 90%,55% 90%,70% 90%}50%{background-position:0% 80%,0% 20%,10% 40%,20% 0%,30% 30%,22% 50%,50% 50%,65% 20%,90% 30%}100%{background-position:0% 70%,0% 10%,10% 30%,20% -10%,30% 20%,22% 40%,50% 40%,65% 10%,90% 20%;background-size:0% 0%,0% 0%,0% 0%,0% 0%,0% 0%,0% 0%}}@keyframes bottomBubbles{0%{background-position:10% -10%,30% 10%,55% -10%,70% -10%,85% -10%,70% -10%,70% 0%}50%{background-position:0% 80%,20% 80%,45% 60%,60% 100%,75% 70%,95% 60%,105% 0%}100%{background-position:0% 90%,20% 90%,45% 70%,60% 110%,75% 80%,95% 70%,110% 10%;background-size:0% 0%,0% 0%,0% 0%,0% 0%,0% 0%,0% 0%}}@media(min-width:1025px){.cart-btn-desktop{overflow:hidden;position:relative;transition:all 0.5s}.cart-btn-desktop .cart-icon-container{position:absolute;left:-50px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;z-index:2;transition:all 0.5s}.cart-btn-desktop .cart-text{transition:all 0.5s}.cart-btn-desktop:hover .cart-icon-container{transform:translateX(70px)}.cart-btn-desktop:hover .cart-text{transform:translate(10px,0)}.cart-btn-desktop:active{transform:scale(0.95)}}.remove-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:2px solid white;border-radius:50%;cursor:pointer;position:absolute;right:8px;top:50%;transform:translateY(-50%);overflow:visible;transition:all 0.3s;background:transparent}.remove-btn .remove-sign{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;transition:opacity 0.3s}.remove-btn .remove-sign svg{width:12px;fill:white}.remove-btn .remove-text{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:0;color:white;font-size:0.85em;font-weight:600;transition:opacity 0.3s;white-space:nowrap}.remove-btn:hover{width:80px;border-radius:40px}.remove-btn:hover .remove-sign{opacity:0}.remove-btn:hover .remove-text{opacity:1}.remove-btn:active{transform:translateY(-50%) scale(0.95)}`;
            shadow.appendChild(extraStyle);

            var fbtStyle = document.createElement('style');
            fbtStyle.textContent = `.fbt-card{width:100%;height:220px;background:#fff;border-radius:20px;position:relative;overflow:hidden;transition:all 0.5s cubic-bezier(0.16,1,0.3,1);box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);border:1px solid rgba(229,231,235,0.8)}.fbt-card__shine{position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,0) 40%,rgba(255,255,255,0.8) 50%,rgba(255,255,255,0) 60%);opacity:0;transition:opacity 0.3s ease}.fbt-card__glow{position:absolute;inset:-10px;background:radial-gradient(circle at 50% 0%,rgba(37,99,235,0.3) 0%,rgba(37,99,235,0) 70%);opacity:0;transition:opacity 0.5s ease}.fbt-card__content{padding:1.25em;height:100%;display:flex;flex-direction:column;gap:0.75em;position:relative;z-index:2}.fbt-card__badge{position:absolute;top:12px;right:12px;background:#10b981;color:white;padding:0.25em 0.5em;border-radius:999px;font-size:0.7em;font-weight:600;transform:scale(0.8);opacity:0;transition:all 0.4s ease 0.1s;z-index:3}.fbt-card__image{width:100%;height:100px;min-height:100px;max-height:100px;background:#f8f9fa;border-radius:12px;transition:all 0.5s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;flex-shrink:0}.fbt-card__text{display:flex;flex-direction:column;gap:0.25em;min-height:0;flex-shrink:1;flex-grow:1}.fbt-card__title{color:#1e293b;font-size:0.9em;margin:0;font-weight:700;transition:all 0.3s ease;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;max-height:2.6em}.fbt-card__footer{display:flex;justify-content:space-between;align-items:center;margin-top:auto;flex-shrink:0}.fbt-card__price{color:#1e293b;font-weight:700;font-size:1em;transition:all 0.3s ease}.fbt-card__button{width:28px;height:28px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;transition:all 0.3s ease;transform:scale(0.9);border:none;flex-shrink:0}.fbt-card:hover{transform:translateY(-10px);box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);border-color:rgba(37,99,235,0.2)}.fbt-card:hover .fbt-card__shine{opacity:1;animation:shine 3s infinite}.fbt-card:hover .fbt-card__glow{opacity:1}.fbt-card:hover .fbt-card__image{transform:translateY(-5px) scale(1.03);box-shadow:0 10px 15px -3px rgba(0,0,0,0.1)}.fbt-card:hover .fbt-card__title{color:#2563eb;transform:translateX(2px)}.fbt-card:hover .fbt-card__price{color:#2563eb;transform:translateX(2px)}.fbt-card:hover .fbt-card__button{transform:scale(1);box-shadow:0 0 0 4px rgba(37,99,235,0.2)}.fbt-card:hover .fbt-card__button svg{animation:btnPulse 1.5s infinite}.fbt-card:active{transform:translateY(-5px) scale(0.98)}.fbt-card-selected .fbt-card__badge{transform:scale(1);opacity:1}.fbt-card-selected .fbt-card__button{background:#10b981}@keyframes shine{0%{background-position:-100% 0}100%{background-position:200% 0}}@keyframes btnPulse{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}`;
            shadow.appendChild(fbtStyle);

            var appRoot = document.createElement('div');
            shadow.appendChild(appRoot);

            // P4 OPTIMIZED: Wrap with ErrorBoundary for graceful error handling
            ReactDOM.createRoot(appRoot).render(
                e(ErrorBoundary, null, e(ProductApp))
            );
        } catch(error) {
            console.error('Gstore EPP: Critical render error', error);
        }
    }

    // Wait for React to be fully loaded with retry logic
    function waitForReact(callback, retries) {
        retries = retries || 0;
        if (window.React && window.ReactDOM) {
            console.log('✅ GSTORE EPP: React loaded, mounting...');
            callback();
        } else if (retries < 50) { // 5 seconds max (50 * 100ms)
            console.log('⏳ GSTORE EPP: Waiting for React... (attempt ' + (retries + 1) + ')');
            setTimeout(function(){ waitForReact(callback, retries + 1); }, 100);
        } else {
            console.error('❌ GSTORE EPP: React failed to load after 5 seconds');
            var host = document.getElementById('gstore-epp-shadow-host');
            if (host) {
                host.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626;background:#fee2e2;border-radius:8px;margin:20px;"><h3 style="margin:0 0 10px 0;">⚠️ Failed to Load Product Page</h3><p style="margin:0;">React libraries failed to load. Please check your internet connection and refresh the page.</p></div>';
            }
        }
    }

    if (document.readyState === 'loading') {
        console.log('⏳ GSTORE EPP: Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', function(){ waitForReact(mount); });
    } else {
        console.log('✅ GSTORE EPP: DOM ready, waiting for React...');
        waitForReact(mount);
    }

    console.log('📜 GSTORE EPP: Script loaded successfully');

})();