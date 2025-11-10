(function(){

    function money(n){ var x = Number(n||0); return isFinite(x) ? Math.floor(x).toString() : "0"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
        // VERSION CHECK: Verify the latest code with all fixes is loaded
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

        // Helper: Check if the battery tier should be shown (only for iPhones)
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

        function ProductApp(){
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

            var gallery = BOOT.gallery || [];
            var hasGallery = gallery.length > 0;

            // Calculate visible thumbnails based on available height
            var visibleGalleryCount = useMemo(function(){
                if (!heroImageHeight) return isMobile ? 3 : 4; // Default

                // Since the gallery is centered, we can be more generous with space
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

            // Sync heroImage with cur.image when the product changes
            useEffect(function(){
                setHeroImage(cur.image || BOOT.image);
                setGalleryScroll(0); // Reset scroll when the product changes
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

            // Load siblings
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/siblings?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setSiblings(j.siblings||[]); }
                }).catch(function(e){ console.error('siblings fetch failed', e); });
            }, []);

            // Load the pricing and set the default tier - reload when the product changes
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/pricing?product_id=' + cur.productId;
                fetchJSON(url).then(function(j){
                    setRules(j);
                    // Set the default tier immediately when rules load for used products
                    if (j && j.exists && j.default_condition && cond==='used'){
                        setTier(j.default_condition);
                    }
                }).catch(function(e){ console.error('pricing fetch failed', e); });
            }, [cur.productId, cond]);

            // Load FBT - reload when the product changes (storage switch)
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
                        if (j.laptop_ram && j.laptop_ram.length > 0){
                            j.laptop_ram.forEach(function(item){ allAddons.push({...item, type: 'ram'}); });
                        }
                        if (j.laptop_storage && j.laptop_storage.length > 0){
                            j.laptop_storage.forEach(function(item){ allAddons.push({...item, type: 'storage'}); });
                        }
                        setLaptopAddons(allAddons);
                    }
                }).catch(function(e){ console.error('laptop addons fetch failed', e); });
            }, [cur.deviceType]);

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

            // SMART DEFAULT: Apply the default tier when switching to USED
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
                        var key = (String(p.color||'').toLowerCase().replace(/\s+/g,'')) || ('id-'+p.id);
                        if (!seen[key]){
                            seen[key]=true;
                            list.push({ id:p.id, color:p.color||'', image:p.image });
                        }
                    }
                });
                return list;
            }, [siblings, cond, cur.storage]);

            function switchToProductId(id){
                var p = siblings.find(function(x){ return Number(x.id)===Number(id); });
                if (!p) return;
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

                if (newCond === 'used' && rules && rules.exists && rules.default_condition) {
                    setTier(rules.default_condition);
                } else {
                    setTier(null);
                }

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

            // SMART DEFAULT: Auto-select first available storage when condition changes
            useEffect(function(){
                var availableStorages = Object.keys(storages);
                if (availableStorages.length > 0) {
                    var currentAvailable = storages[cur.storage];
                    if (!currentAvailable) {
                        switchStorage(availableStorages[0]);
                    }
                }
            }, [cond]);

            var priceBlock = useMemo(function(){
                var reg = parseFloat(cur.regular||cur.price||0);
                var sale = parseFloat(cur.sale||0);
                var showSale = (sale>0 && sale<reg) ? sale : null;

                if (!rules || !rules.exists || cond==='new'){
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
            }, [cur, rules, tier, newBat, cond]);

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
                    onClick:function(){ if(enabled) setCond(key); }
                }, lbl);
            }

            // P3 OPTIMIZED: Use reducer action for FBT toggle
            function toggleFBT(id){
                dispatch({type: 'TOGGLE_FBT', payload: id});
            }

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

// OPTIMIZED: Icons organized in single objects for better maintainability
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

            // Create a sticky bar outside Shadow DOM for mobile
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
                // Use z-index 99 to stay below the side menu, cart, and navigation
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
                buyBtn.style.cssText = 'background:white;border:2px solid #2563eb;color:#2563eb;font-weight:500;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer';
                buyBtn.textContent = t('buy_now', 'Buy Now');
                buyBtn.onclick = function(){ addToCart('/checkout/'); };

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

                // Observe the CTA section in the desktop layout
                var observer = new IntersectionObserver(function(entries){
                    entries.forEach(function(entry){
                        // Show a sticky bar when CTA is NOT visible
                        setShowDesktopSticky(!entry.isIntersecting);
                    });
                }, {threshold: 0});

                // OPTIMIZED: Wait for DOM with timeout to prevent the infinite interval
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

            // Create a desktop sticky bar
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

                // Find a sticky header row and account for the WordPress admin bar
                var header = document.querySelector('.whb-sticky-row') || document.querySelector('.whb-general-header') || document.querySelector('header');
                var headerHeight = header ? header.offsetHeight : 0;
                var adminBar = document.getElementById('wpadminbar');
                var adminBarHeight = adminBar ? adminBar.offsetHeight : 0;
                var totalTopOffset = headerHeight + adminBarHeight;

                // Stick directly below the header (accounting for admin bar) with z-index 99 to stay below cart, search, and navigation
                stickyBar.style.cssText = 'position:fixed;top:' + totalTopOffset + 'px;left:0;right:0;background:white;border-bottom:1px solid #e5e7eb;padding:1rem 2rem;display:flex;align-items:center;justify-content:center;gap:1rem;z-index:99;box-shadow:0 2px 10px rgba(0,0,0,0.1)';

                var container = document.createElement('div');
                container.style.cssText = 'max-width:80rem;width:100%;display:flex;align-items:center;justify-content:space-between;gap:2rem';

                // Left section: Prices and Product name (swapped order)
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
                buyBtn.style.cssText = 'background:white;border:2px solid #d1d5db;color:#374151;font-weight:500;padding:0.75rem 2rem;border-radius:0.5rem;cursor:pointer;font-size:1rem';
                buyBtn.textContent = t('buy_now', 'Buy Now') + ' ' + gel(grandTotal);
                buyBtn.onclick = function(){ addToCart('/checkout/'); };

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

            // MOBILE LAYOUT
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
                            // Hero image with an overlaid vertical gallery (left side, fit to image height)
                            e("div",{key:"hero-gallery",className:"relative",style:{width:'100%'}},[
                                // Hero image (full width)
                                e("img",{
                                    key:"hero",
                                    src:heroImage,
                                    alt:cur.title||"Product",
                                    className:"w-full rounded-lg object-cover",
                                    onLoad:function(ev){ setHeroImageHeight(ev.target.offsetHeight); }
                                }),
                                // Gallery thumbnails (overlaid vertically on the left side, centered Y-axis)
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
                                    var cls = "h-16 w-16 rounded-lg object-cover cursor-pointer border-2 "+(active?"border-blue-600":"border-gray-300");
                                    return e("img",{
                                        key:c.id,
                                        src:c.image,
                                        alt:c.color||'color',
                                        className:cls,
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

                        // 4. Storage - hides unavailable options and entire section for laptops
                        (function(){
                            var availStorages = ALL_STORAGES.filter(function(st){ return storages[st]; });
                            if (availStorages.length === 0) return null;
                            return e("div",{key:"storage"},[
                                e("h3",{className:"text-sm font-semibold mb-2 text-center"},t('storage_options_text', 'Storage')),
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

                        // 5. Condition and Battery Tiers - fixed sizing for up to 3 options
                        e("div",{key:"condition"},[
                            e("h3",{className:"text-sm font-semibold mb-2 text-center"},t('condition_label', 'Condition')),
                            e("div",{key:"condition",className:"flex mb-2",style:{gap:'0.5rem',justifyContent:'center'}},[
                                avail.hasNew && e("button",{
                                    key:"new",
                                    className:"text-center py-2 text-sm font-medium border border-gray-200 rounded-lg "+(cond==='new'?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700"),
                                    style:{width:'90px'},
                                    onClick:function(){ setCond('new'); }
                                }, conditionNewText),
                                avail.hasUsed && e("button",{
                                    key:"used",
                                    className:"text-center py-2 text-sm font-medium border border-gray-200 rounded-lg "+(cond==='used'?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700"),
                                    style:{width:'90px'},
                                    onClick:function(){ setCond('used'); }
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
                                    var cls = "flex-1 text-center py-2 text-xs font-medium border border-gray-200 ";
                                    if (idx === 0) cls += "rounded-l-lg ";
                                    if (idx === USED_TIERS.length - 1) cls += "rounded-r-lg ";
                                    if (active) cls += "bg-green-600 text-white border-green-600";
                                    else if (enabled) cls += "bg-white text-gray-700";
                                    else cls += "bg-gray-100 text-gray-400";
                                    return e("button",{
                                        key:t,
                                        className:cls,
                                        disabled:!enabled,
                                        onClick:function(){ if(enabled) setTier(t); }
                                    }, (hasSale ? "🔥 " : "") + t + '%');
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
                    showWarrantyModal && e("div",{
                        key:"warranty-modal",
                        className:"fixed inset-0 z-50 flex items-center justify-center pt-16",
                        onClick:function(){ setShowWarrantyModal(false); },
                        onWheel:handleModalWrapperScroll
                    },[
                        e("div",{
                            key:"modal",
                            className:"relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col overflow-hidden",
                            style:{maxHeight:"85vh"},
                            onClick:function(ev){ ev.stopPropagation(); }
                        },[
                            e("div",{key:"header",className:"flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0"},[
                                e("h2",{key:"title",className:"text-xl font-semibold text-gray-900"},"Warranty Information"),
                                e("button",{
                                    key:"close",
                                    className:"text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0",
                                    onClick:function(){ setShowWarrantyModal(false); }
                                },[
                                    e("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-6 w-6",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},[
                                        e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})
                                    ])
                                ])
                            ]),
                            e("div",{
                                key:"content",
                                ref:modalContentRef,
                                className:"p-6 text-gray-700 overflow-y-auto flex-1",
                                dangerouslySetInnerHTML:{__html: BOOT.warrantyContent || '<p>No warranty information is available.</p>'}
                            })
                        ])
                    ])
                ]);
            }

            // DESKTOP LAYOUT
            return e("div",{className:"min-h-screen bg-white"},[
                e("div",{key:"main",className:"max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8"},[
                    // LEFT: Photos + Description + Tabs
                    e("div",{key:"left",className:"space-y-6"},[
                        // Hero image with an overlaid vertical gallery (left side, fit to image height)
                        e("div",{key:"hero-gallery",className:"relative",style:{width:'100%'}},[
                            // Hero image (full width)
                            e("img",{
                                key:"hero",
                                src:heroImage,
                                alt:cur.title||"Product",
                                className:"w-full rounded-2xl shadow-md object-cover",
                                onLoad:function(ev){ setHeroImageHeight(ev.target.offsetHeight); }
                            }),
                            // Gallery thumbnails (overlaid vertically on the left side, centered Y-axis)
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
                                var cls = "h-16 w-16 rounded-lg object-cover cursor-pointer border-2 "+(active?"border-blue-600":"border-gray-200");
                                return e("img",{
                                    key:c.id,
                                    src:c.image,
                                    alt:c.color||'color',
                                    className:cls,
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
                                                e("span",{key:"label",className:"font-medium"},t('add_to_compare', 'Add Product to Compare'))
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
                            e("div",{},[
                                e("div",{key:"tiers",className:"flex rounded-lg overflow-hidden"},
                                    USED_TIERS.map(function(t, idx){
                                        var pr = rules.pricing || {};
                                        var row = pr[t] || {};
                                        var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                        var active = (tier===t);
                                        var reg = parseFloat(row.regular||0);
                                        var sale = parseFloat(row.sale||0);
                                        var hasSale = (sale > 0 && sale < reg);
                                        var cls = "flex-1 text-center py-2 text-sm font-medium transition-all border border-gray-200 ";
                                        if (idx === 0) cls += "rounded-l-lg ";
                                        if (idx === USED_TIERS.length - 1) cls += "rounded-r-lg ";
                                        if (active) cls += "bg-green-600 text-white border-green-600";
                                        else if (enabled) cls += "bg-white text-gray-700 hover:bg-green-50 cursor-pointer";
                                        else cls += "bg-gray-100 text-gray-400 cursor-not-allowed";

                                        return e("button",{
                                            key:t,
                                            className:cls,
                                            disabled:!enabled,
                                            onClick:function(){ if(enabled) setTier(t); }
                                        }, (hasSale ? "🔥 " : "") + t + '%');
                                    })
                                ),

                                // NEW BATTERY - with translation
                                (function(){
                                    var nb = (rules.pricing||{})['new_battery']||{};
                                    var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                    if (!hasPrice) return null;

                                    return e("div",{key:"newbat",className:"mt-3"},[
                                        e("button",{
                                            className:"w-full py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (newBat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                            onClick:function(){ setNewBat(!newBat); }
                                        }, [
                                            newBat ? "✓ " : "+ ",
                                            batteryPriceBlock.hasSale && e("span",{key:"sale-badge",className:"text-red-600"},"🔥 "),
                                            newBat ? "New Battery Added (" : "Add New Battery (",
                                            batteryPriceBlock.hasSale && e("span",{key:"reg",className:"line-through text-gray-400"},"+₾"+Math.floor(batteryPriceBlock.regular)+" "),
                                            "+₾"+Math.floor(batteryPrice),
                                            ")"
                                        ])
                                    ]);
                                })()
                            ])
                        ]),

                        // Laptop Add-ons (RAM/Storage) - Desktop
                        cur.deviceType === 'laptop' && laptopAddons.length > 0 && e("div",{key:"laptop-addons",className:"mt-3",style:{display:'flex',flexWrap:'wrap',gap:'0.5rem'}},
                            laptopAddons.map(function(addon){
                                var isSelected = selectedAddons.indexOf(addon.key) >= 0;
                                return e("button",{
                                        key:addon.key,
                                        className:"py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                        style:{flex:'1 1 0'},
                                        onClick:function(){ toggleAddon(addon.key); }
                                    }, isSelected
                                        ? "✓ " + addon.label + " (+" + gel(addon.price) + ")"
                                        : "+ " + addon.label + " (+" + gel(addon.price) + ")"
                                );
                            })
                        ),

                        // CTAs - with translations
                        e("div",{key:"cta",className:"flex gap-3 mt-6","data-gstore-cta": "true"},[
                            e("button",{
                                key:"cart",
                                className:"flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2",
                                onClick:function(){ addToCart(null); }
                            },[
                                e(CartIcon,{key:"icon"}),
                                " " + t('add_to_cart', 'Add to Cart') + " " + gel(grandTotal)
                            ]),
                            e("button",{
                                key:"buy",
                                className:"flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-all",
                                onClick:function(){ addToCart('/checkout/'); }
                            }, t('buy_now', 'Buy Now') + " " + gel(grandTotal))
                        ]),

                        // FBT - with translations
                        fbt.length>0 && e("div",{key:"fbt",className:"mt-6 shadow-sm border rounded-lg p-4"},[
                            e("h3",{key:"title",className:"text-base font-semibold mb-4"},t('fbt_title', 'Frequently Bought Together')),
                            e("div",{key:"grid",className:"grid sm:grid-cols-3 gap-3"},
                                fbt.map(function(item){
                                    var isSelected = selectedFBT.indexOf(item.id) >= 0;
                                    return e("div",{
                                        key:item.id,
                                        className:"shadow-sm border rounded-lg p-2 text-center text-sm flex flex-col "+(isSelected?"border-blue-500 bg-blue-50":"border-gray-200")
                                    },[
                                        e("img",{
                                            key:"img",
                                            src:item.image,
                                            alt:item.title,
                                            className:"w-full h-24 object-cover rounded-md mb-1"
                                        }),
                                        e("p",{key:"name",className:"font-medium flex-1 min-h-[2.5rem] flex items-center justify-center"},item.title),
                                        e("button",{
                                                key:"btn",
                                                className:"mt-2 w-full text-xs py-1 rounded-md border transition-all "+(isSelected?"bg-blue-600 text-white":"bg-white text-gray-700 hover:bg-blue-100"),
                                                onClick:function(){ toggleFBT(item.id); }
                                            }, isSelected
                                                ? t('added_button', '✓ Added (₾{price})', {price: item.price})
                                                : t('add_button', '+ Add ₾{price}', {price: item.price})
                                        )
                                    ]);
                                })
                            )
                        ])
                    ]),

                    // Warranty Modal
                    showWarrantyModal && e("div",{
                        key:"warranty-modal",
                        className:"fixed inset-0 z-50 flex items-center justify-center pt-16",
                        onClick:function(){ setShowWarrantyModal(false); },
                        onWheel:handleModalWrapperScroll
                    },[
                        e("div",{
                            key:"modal",
                            className:"relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col overflow-hidden",
                            style:{maxHeight:"85vh"},
                            onClick:function(ev){ ev.stopPropagation(); }
                        },[
                            e("div",{key:"header",className:"flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0"},[
                                e("h2",{key:"title",className:"text-xl font-semibold text-gray-900"},"Warranty Information"),
                                e("button",{
                                    key:"close",
                                    className:"text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0",
                                    onClick:function(){ setShowWarrantyModal(false); }
                                },[
                                    e("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-6 w-6",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},[
                                        e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})
                                    ])
                                ])
                            ]),
                            e("div",{
                                key:"content",
                                ref:modalContentRef,
                                className:"p-6 text-gray-700 overflow-y-auto flex-1",
                                dangerouslySetInnerHTML:{__html: BOOT.warrantyContent || '<p>No warranty information is available.</p>'}
                            })
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
            extraStyle.textContent = `.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{top:0;right:0;bottom:0;left:0}.left-0{left:0}.right-0{right:0}.bottom-0{bottom:0}.z-50{z-index:50}.border-t{border-top-width:1px}.border-b{border-bottom-width:1px}.bg-opacity-40{--tw-bg-opacity:0.4}.bg-opacity-50{--tw-bg-opacity:0.5}.bg-black{--tw-bg-opacity:1;background-color:rgb(0 0 0/var(--tw-bg-opacity))}.bg-gray-400{--tw-bg-opacity:1;background-color:rgb(156 163 175/var(--tw-bg-opacity))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(229 231 235/var(--tw-bg-opacity))}.max-w-2xl{max-width:42rem}.mx-4{margin-left:1rem;margin-right:1rem}.max-h-\[70vh\]{max-height:70vh}.h-6{height:1.5rem}.h-8{height:2rem}.h-14{height:3.5rem}.h-64{height:16rem}.w-6{width:1.5rem}.w-10{width:2.5rem}.w-3\/4{width:75%}.w-1\/2{width:50%}.w-5\/6{width:83.333333%}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-\[7px\]{font-size:7px}.text-\[8px\]{font-size:8px}.text-\[10px\]{font-size:10px}.text-\[11px\]{font-size:11px}.underline{text-decoration-line:underline}.bg-transparent{background-color:transparent}.border-0{border-width:0}.border-2{border-width:2px}.flex-shrink-0{flex-shrink:0}.flex-1{flex:1 1 0%}.flex-col{flex-direction:column}.p-1\.5{padding:0.375rem}.p-2\.5{padding:0.625rem}.p-3{padding:0.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-0\.5{padding-top:0.125rem;padding-bottom:0.125rem}.py-3{padding-top:0.75rem;padding-bottom:0.75rem}.pb-24{padding-bottom:6rem}.mb-1{margin-bottom:0.25rem}.mt-auto{margin-top:auto}.leading-tight{line-height:1.25}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(0.5rem * var(--tw-space-y-reverse))}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(0.75rem * var(--tw-space-y-reverse))}.space-y-4>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1rem * var(--tw-space-y-reverse))}.hover\:text-blue-800:hover{--tw-text-opacity:1;color:rgb(30 64 175/var(--tw-text-opacity))}.hover\:text-gray-600:hover{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.hover\:bg-green-700:hover{--tw-bg-opacity:1;background-color:rgb(21 128 61/var(--tw-bg-opacity))}.hover\:bg-blue-50:hover{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.hover\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.shadow-xl{--tw-shadow:0 20px 25px -5px rgb(0 0 0/.1),0 8px 10px -6px rgb(0 0 0/.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.animate-pulse{animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}.min-w-\[60px\]{min-width:60px!important}.min-w-\[70px\]{min-width:70px!important}.min-w-\[80px\]{min-width:80px!important}`;
            shadow.appendChild(extraStyle);

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

    if (document.readyState === 'loading') {
        console.log('⏳ GSTORE EPP: Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        console.log('✅ GSTORE EPP: DOM ready, mounting now...');
        mount();
    }

    console.log('📜 GSTORE EPP: Script loaded successfully');

})();