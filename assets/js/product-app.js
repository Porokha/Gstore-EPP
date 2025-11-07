(function(){
    console.log('Gstore EPP: product-app.js v5.1.1 FIXED - ALL FEATURES + TRANSLATIONS + FIXES');

    function money(n){ var x = Number(n||0); return isFinite(x) ? x.toFixed(2) : "0.00"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
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

        // FIX #4: Battery Health Dynamic Text - ADDED
        function getTierDisplay(tierKey) {
            var displays = {
                '80-85': '82.5%',
                '85-90': '87.5%',
                '90-95': '92.5%',
                '95-100': '97.5%'
            };
            return displays[tierKey] || tierKey;
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

        function fetchJSON(url){
            return fetch(url, {credentials:'same-origin'})
                .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); });
        }

        function ProductApp(){
            var _s1 = useState([]);
            var siblings = _s1[0]; var setSiblings = _s1[1];

            var _s2 = useState({
                productId: BOOT.productId,
                title: BOOT.title,
                permalink: BOOT.permalink,
                price: BOOT.price,
                regular: BOOT.regular,
                sale: BOOT.sale,
                color: BOOT.color,
                condition: (BOOT.condition||'').toLowerCase(),
                deviceType: BOOT.deviceType || 'phone',
                storage: BOOT.storage || '',
                image: BOOT.image
            });
            var cur = _s2[0]; var setCur = _s2[1];

            var _s3 = useState(null);
            var rules = _s3[0]; var setRules = _s3[1];

            var _s4 = useState(null);
            var tier = _s4[0]; var setTier = _s4[1];

            var _s5 = useState(false);
            var newBat = _s5[0]; var setNewBat = _s5[1];

            var _s6 = useState([]);
            var fbt = _s6[0]; var setFbt = _s6[1];

            var _s7 = useState([]);
            var selectedFBT = _s7[0]; var setSelectedFBT = _s7[1];

            var _s8 = useState((typeof window!=='undefined' && window.innerWidth<=768)?null:'specifications');
            var activeTab = _s8[0]; var setActiveTab = _s8[1];

            var _s9 = useState((cur.condition==='new')?'new':'used');
            var cond = _s9[0]; var setCond = _s9[1];

            var _s10 = useState(null);
            var compareProduct = _s10[0]; var setCompareProduct = _s10[1];

            var _s11 = useState(false);
            var showSearch = _s11[0]; var setShowSearch = _s11[1];

            var _s12 = useState('');
            var searchQuery = _s12[0]; var setSearchQuery = _s12[1];

            var _s13 = useState([]);
            var searchResults = _s13[0]; var setSearchResults = _s13[1];

            var _s14 = useState({});
            var currentSpecs = _s14[0]; var setCurrentSpecs = _s14[1];

            var _s15 = useState({});
            var compareSpecs = _s15[0]; var setCompareSpecs = _s15[1];

            var _s16 = useState('');
            var warrantyText = _s16[0]; var setWarrantyText = _s16[1];

            // Load siblings
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/siblings?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setSiblings(j.siblings||[]); }
                }).catch(function(e){ console.error('siblings fetch failed', e); });
            }, []);

            // Load the pricing and set default tier
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/pricing?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    setRules(j);
                    if (j && j.exists && j.default_condition && cond==='used'){
                        setTier(j.default_condition);
                    }
                }).catch(function(e){ console.error('pricing fetch failed', e); });
            }, []);

            // Load FBT
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/fbt?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setFbt(j.products || []); }
                }).catch(function(e){ console.error('fbt fetch failed', e); });
            }, []);

            // Load current product specs
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/compare-specs?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setCurrentSpecs(j.specs || {}); }
                }).catch(function(e){ console.error('specs fetch failed', e); });
            }, []);

            // Load warranty text
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/warranty?product_id=' + cur.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setWarrantyText(j.warranty_text || ''); }
                }).catch(function(e){ console.error('warranty fetch failed', e); });
            }, [cur.productId]);

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

            // FIX #5: Hide Unavailable Options UI - FIXED
            var storages = useMemo(function(){
                var available = {};
                siblings.forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    var match = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    // FIXED: Only show in-stock options
                    if (match && p.storage && p.stock_status !== 'outofstock'){
                        available[p.storage] = true;
                    }
                });
                return available;
            }, [siblings, cond]);

            // FIX #5: Also fix colors to hide unavailable options
            var colors = useMemo(function(){
                var seen = {};
                var list = [];
                siblings.forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    var condMatch = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    var storageMatch = !cur.storage || String(p.storage).toLowerCase()===String(cur.storage).toLowerCase();

                    // FIXED: Only show in-stock color options
                    if (condMatch && storageMatch && p.stock_status !== 'outofstock'){
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

            // SMART DEFAULT: Auto-select first available storage when switching condition
            useEffect(function(){
                var availStorageList = Object.keys(storages);
                if (!cur.storage || !storages[cur.storage]){
                    var first = ALL_STORAGES.find(function(s){ return storages[s]; });
                    if (first && first !== cur.storage) {
                        switchStorage(first);
                    }
                }
            }, [storages, cur.storage]);

            var finalPr = useMemo(function(){
                var base = Number(cur.price||0);
                var reg = Number(cur.regular||0);

                if (cond==='new' || !rules || !rules.exists) return { price:base, regular:reg, discount_amount:0, isDiscounted:false };

                var st = cur.storage || '';
                var pricing = rules.pricing || {};
                var storageRule = pricing[st];
                if (!storageRule) return { price:base, regular:reg, discount_amount:0, isDiscounted:false };

                var tiers = storageRule.tiers || {};
                var tierData = tier ? tiers[tier] : null;
                if (!tierData) return { price:base, regular:reg, discount_amount:0, isDiscounted:false };

                var newPrice = Number(tierData.price||base);
                var newBatAdd = newBat && storageRule.new_battery ? Number(storageRule.new_battery.price||0) : 0;
                var total = newPrice + newBatAdd;

                return {
                    price: total,
                    regular: reg>0 ? reg : base,
                    discount_amount: Math.max(0, base-total),
                    isDiscounted: total < base
                };
            }, [cur, cond, rules, tier, newBat]);

            function addToCart(){
                var qty = 1;
                var cartData = {
                    product_id: cur.productId,
                    quantity: qty
                };

                if (cond === 'used' && tier) {
                    cartData.gstore_tier = tier;
                    cartData.gstore_tier_price = finalPr.price;
                }

                if (newBat && rules && rules.pricing && rules.pricing[cur.storage] && rules.pricing[cur.storage].new_battery) {
                    cartData.gstore_new_battery = 'yes';
                    cartData.gstore_battery_price = Number(rules.pricing[cur.storage].new_battery.price || 0);
                }

                // Add selected FBT items
                selectedFBT.forEach(function(fbtId){
                    cartData['fbt_' + fbtId] = 1;
                });

                var formData = new FormData();
                Object.keys(cartData).forEach(function(key){
                    formData.append(key, cartData[key]);
                });
                formData.append('add-to-cart', cur.productId);

                fetch(window.location.href, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                })
                    .then(function(response){
                        if (response.ok) {
                            window.location.reload();
                        } else {
                            console.error('Failed to add to cart:', response.statusText);
                        }
                    })
                    .catch(function(error){
                        console.error('Add to cart error:', error);
                    });
            }

            // Create mobile sticky bar
            useEffect(function(){
                if (typeof window === 'undefined' || window.innerWidth > 768) return;

                var existingBar = document.getElementById('gstore-sticky-cta');
                if (existingBar) existingBar.remove();

                var bar = document.createElement('div');
                bar.id = 'gstore-sticky-cta';
                bar.innerHTML =
                    '<div class="gstore-sticky-cta-inner">' +
                    '<div class="gstore-prices">' +
                    (finalPr.isDiscounted ? '<div class="regular">' + gel(finalPr.regular) + '</div>' : '') +
                    '<div class="sale">' + gel(finalPr.price) + '</div>' +
                    '</div>' +
                    '<div class="gstore-actions">' +
                    '<button class="btn-cart" onclick="window.gstoreAddToCart && window.gstoreAddToCart()"></button>' +
                    '<button class="btn-buy" onclick="window.gstoreAddToCart && window.gstoreAddToCart()">' + t('add_to_cart', 'Add to Cart') + '</button>' +
                    '</div>' +
                    '</div>';

                document.body.appendChild(bar);
                window.gstoreAddToCart = addToCart;

                return function(){
                    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
                };
            }, [finalPr, t]);

            function toggleFBT(productId){
                var id = Number(productId);
                setSelectedFBT(function(prev){
                    if (prev.includes(id)) {
                        return prev.filter(function(x){ return x !== id; });
                    } else {
                        return prev.concat([id]);
                    }
                });
            }

            var fbtTotal = useMemo(function(){
                return selectedFBT.reduce(function(sum, id){
                    var item = fbt.find(function(x){ return Number(x.id) === id; });
                    return sum + (item ? Number(item.price || 0) : 0);
                }, 0);
            }, [selectedFBT, fbt]);

            // FIX #1: Price Color Bug - FIXED
            function PriceDisplay(props) {
                var price = props.price;
                var regular = props.regular;
                var isDiscounted = props.isDiscounted;

                return e('div', { className: 'price-display' },
                    regular && isDiscounted ? e('span', {
                        className: 'regular-price text-sm line-through text-gray-500'
                    }, gel(regular)) : null,
                    e('span', {
                        className: 'sale-price text-2xl font-bold',
                        // FIX #1: FIXED - Red only for discounted prices, black for regular prices
                        style: {
                            color: isDiscounted ? '#dc2626' : '#111827'
                        }
                    }, gel(price))
                );
            }

            function ConditionSelector(){
                var conditions = [
                    { key: 'new', label: t('condition_new', 'New'), available: avail.hasNew },
                    { key: 'used', label: t('condition_used', 'Used'), available: avail.hasUsed },
                    { key: 'openbox', label: t('condition_openbox', 'Open Box'), available: avail.hasOpen }
                ];

                return e('div', { className: 'epp-condition-selector mb-6' },
                    e('div', { className: 'flex gap-2' },
                        conditions.map(function(c){
                            if (!c.available) return null;
                            var active = cond === c.key;
                            return e('button', {
                                key: c.key,
                                className: 'px-4 py-2 rounded-lg border transition-all ' +
                                    (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'),
                                onClick: function(){ setCond(c.key); }
                            }, c.label);
                        }).filter(Boolean)
                    )
                );
            }

            function StorageSelector(){
                if (!Object.keys(storages).length) return null;

                return e('div', { className: 'epp-storage-selector mb-6' },
                    e('h3', { className: 'text-lg font-semibold mb-3' }, t('storage', 'Storage')),
                    e('div', { className: 'flex flex-wrap gap-2' },
                        ALL_STORAGES.map(function(st){
                            if (!storages[st]) return null;
                            var active = cur.storage === st;
                            return e('button', {
                                key: st,
                                className: 'px-4 py-2 rounded-lg border transition-all ' +
                                    (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'),
                                onClick: function(){ switchStorage(st); }
                            }, st);
                        }).filter(Boolean)
                    )
                );
            }

            function ColorSelector(){
                if (!colors.length) return null;

                return e('div', { className: 'epp-color-selector mb-6' },
                    e('h3', { className: 'text-lg font-semibold mb-3' }, t('color', 'Color')),
                    e('div', { className: 'flex flex-wrap gap-3' },
                        colors.map(function(c){
                            var active = Number(c.id) === Number(cur.productId);
                            return e('div', {
                                    key: c.id,
                                    className: 'cursor-pointer p-2 rounded-lg border transition-all ' +
                                        (active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'),
                                    onClick: function(){ switchToProductId(c.id); }
                                },
                                c.image ? e('img', {
                                    src: c.image,
                                    alt: c.color,
                                    className: 'w-16 h-16 object-cover rounded-md mb-2'
                                }) : null,
                                e('div', { className: 'text-sm text-center' }, c.color || t('no_color', 'Default'))
                            );
                        })
                    )
                );
            }

            function TierSelector(){
                if (cond !== 'used' || !rules || !rules.exists) return null;

                var st = cur.storage || '';
                var pricing = rules.pricing || {};
                var storageRule = pricing[st];
                if (!storageRule || !storageRule.tiers) return null;

                var tiers = storageRule.tiers;
                var tierKeys = Object.keys(tiers);
                if (!tierKeys.length) return null;

                return e('div', { className: 'epp-tier-selector mb-6' },
                    e('h3', { className: 'text-lg font-semibold mb-3' }, t('battery_health', 'Battery Health')),
                    e('div', { className: 'grid grid-cols-2 gap-2' },
                        tierKeys.map(function(tierKey){
                            var tierData = tiers[tierKey];
                            var active = tier === tierKey;
                            return e('button', {
                                    key: tierKey,
                                    className: 'p-3 rounded-lg border text-left transition-all ' +
                                        (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'),
                                    onClick: function(){ setTier(tierKey); }
                                },
                                // FIX #4: Battery Health Dynamic Text - FIXED
                                e('div', { className: 'font-medium' }, getTierDisplay(tierKey)),
                                e('div', { className: 'text-sm opacity-75' }, gel(tierData.price))
                            );
                        })
                    )
                );
            }

            function NewBatteryOption(){
                if (cond !== 'used' || !rules || !rules.exists) return null;

                var st = cur.storage || '';
                var pricing = rules.pricing || {};
                var storageRule = pricing[st];
                if (!storageRule || !storageRule.new_battery) return null;

                var newBatteryData = storageRule.new_battery;

                return e('div', { className: 'epp-new-battery mb-6' },
                    e('label', { className: 'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50' },
                        e('input', {
                            type: 'checkbox',
                            checked: newBat,
                            onChange: function(evt){ setNewBat(evt.target.checked); },
                            className: 'w-5 h-5'
                        }),
                        e('div', null,
                            e('div', { className: 'font-medium' }, t('new_battery', 'New Battery')),
                            e('div', { className: 'text-sm text-gray-600' }, '+' + gel(newBatteryData.price))
                        )
                    )
                );
            }

            function FrequentlyBoughtTogether(){
                if (!fbt.length) return null;

                return e('div', { className: 'epp-fbt mb-8' },
                    e('h3', { className: 'text-xl font-bold mb-4' }, t('frequently_bought_together', 'Frequently Bought Together')),
                    e('div', { className: 'space-y-3' },
                        fbt.map(function(item){
                            var isSelected = selectedFBT.includes(Number(item.id));
                            return e('div', {
                                    key: item.id,
                                    className: 'flex items-center gap-4 p-4 border rounded-lg ' + (isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200')
                                },
                                e('input', {
                                    type: 'checkbox',
                                    checked: isSelected,
                                    onChange: function(){ toggleFBT(item.id); },
                                    className: 'w-5 h-5'
                                }),
                                item.image ? e('img', {
                                    src: item.image,
                                    alt: item.title,
                                    className: 'w-16 h-16 object-cover rounded-md'
                                }) : null,
                                e('div', { className: 'flex-1' },
                                    e('h4', { className: 'font-medium' }, item.title),
                                    e('div', { className: 'text-lg font-bold text-blue-600' }, gel(item.price))
                                )
                            );
                        })
                    ),
                    selectedFBT.length > 0 ? e('div', { className: 'mt-4 p-4 bg-gray-50 rounded-lg' },
                        e('div', { className: 'font-medium' }, t('fbt_total', 'Additional items total') + ': ' + gel(fbtTotal))
                    ) : null
                );
            }

            function ProductTabs(){
                var tabs = [
                    { key: 'specifications', label: t('specifications', 'Specifications') },
                    { key: 'warranty', label: t('warranty', 'Warranty') }
                ];

                if (Object.keys(compareSpecs).length > 0) {
                    tabs.push({ key: 'compare', label: t('compare', 'Compare') });
                }

                return e('div', { className: 'epp-tabs mb-8' },
                    e('div', { className: 'flex border-b mb-4' },
                        tabs.map(function(tab){
                            var active = activeTab === tab.key;
                            return e('button', {
                                key: tab.key,
                                className: 'px-4 py-2 border-b-2 transition-all ' +
                                    (active ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-blue-600'),
                                onClick: function(){ setActiveTab(tab.key); }
                            }, tab.label);
                        })
                    ),
                    e('div', { className: 'epp-tabs-panel' },
                        activeTab === 'specifications' ? SpecificationsPanel() :
                            activeTab === 'warranty' ? WarrantyPanel() :
                                activeTab === 'compare' ? ComparePanel() : null
                    )
                );
            }

            function SpecificationsPanel(){
                if (!Object.keys(currentSpecs).length) {
                    return e('div', { className: 'text-gray-500' }, t('no_specs', 'No specifications available'));
                }

                return e('div', { className: 'space-y-4' },
                    Object.keys(currentSpecs).map(function(key){
                        return e('div', { key: key, className: 'flex justify-between py-2 border-b border-gray-100' },
                            e('span', { className: 'font-medium text-gray-700' }, key),
                            e('span', { className: 'text-gray-900' }, currentSpecs[key])
                        );
                    })
                );
            }

            function WarrantyPanel(){
                return e('div', { className: 'prose max-w-none' },
                    warrantyText ?
                        e('div', { dangerouslySetInnerHTML: { __html: warrantyText } }) :
                        e('div', { className: 'text-gray-500' }, t('no_warranty_info', 'No warranty information available'))
                );
            }

            function ComparePanel(){
                if (!Object.keys(compareSpecs).length) return null;

                return e('div', null,
                    e('div', { className: 'mb-4' },
                        e('input', {
                            type: 'text',
                            placeholder: t('search_products', 'Search products to compare'),
                            value: searchQuery,
                            onChange: function(e){ setSearchQuery(e.target.value); },
                            className: 'w-full p-3 border border-gray-300 rounded-lg'
                        })
                    ),
                    searchResults.length > 0 ? e('div', { className: 'mb-6' },
                        e('h4', { className: 'font-medium mb-2' }, t('search_results', 'Search Results')),
                        e('div', { className: 'space-y-2' },
                            searchResults.map(function(product){
                                return e('div', {
                                        key: product.id,
                                        className: 'p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300',
                                        onClick: function(){
                                            setCompareProduct(product.id);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }
                                    },
                                    e('div', { className: 'font-medium' }, product.title),
                                    e('div', { className: 'text-sm text-gray-600' }, gel(product.price))
                                );
                            })
                        )
                    ) : null,
                    CompareTable()
                );
            }

            function CompareTable(){
                var allKeys = new Set();
                Object.keys(currentSpecs).forEach(function(key){ allKeys.add(key); });
                Object.keys(compareSpecs).forEach(function(key){ allKeys.add(key); });
                var sortedKeys = Array.from(allKeys).sort();

                return e('div', { className: 'overflow-x-auto' },
                    e('table', { className: 'w-full border-collapse border border-gray-300' },
                        e('thead', null,
                            e('tr', { className: 'bg-gray-50' },
                                e('th', { className: 'border border-gray-300 p-3 text-left font-medium' }, t('specification', 'Specification')),
                                e('th', { className: 'border border-gray-300 p-3 text-left font-medium' }, cur.title),
                                e('th', { className: 'border border-gray-300 p-3 text-left font-medium' }, t('compare_product', 'Compare Product'))
                            )
                        ),
                        e('tbody', null,
                            sortedKeys.map(function(key){
                                var currentValue = currentSpecs[key] || '-';
                                var compareValue = compareSpecs[key] || '-';
                                var isDifferent = currentValue !== compareValue;

                                return e('tr', { key: key, className: isDifferent ? 'bg-yellow-50' : '' },
                                    e('td', { className: 'border border-gray-300 p-3 font-medium' }, key),
                                    e('td', {
                                        className: 'border border-gray-300 p-3 ' + (isDifferent ? 'bg-blue-50' : '')
                                    }, currentValue),
                                    e('td', {
                                        className: 'border border-gray-300 p-3 ' + (isDifferent ? 'bg-red-50' : '')
                                    }, compareValue)
                                );
                            })
                        )
                    )
                );
            }

            // Main render
            return e('div', { className: 'gstore-app max-w-6xl mx-auto p-6' },
                e('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8' },
                    // Left column - Image and color selector
                    e('div', null,
                        cur.image ? e('img', {
                            src: cur.image,
                            alt: cur.title,
                            className: 'w-full h-96 object-cover rounded-lg mb-6'
                        }) : null,
                        ColorSelector()
                    ),

                    // Right column - Product details and controls
                    e('div', null,
                        e('div', { className: 'epp-product-header mb-6' },
                            e('h1', { className: 'text-3xl font-bold mb-2' }, cur.title),
                            PriceDisplay({
                                price: finalPr.price,
                                regular: finalPr.regular,
                                isDiscounted: finalPr.isDiscounted
                            })
                        ),

                        ConditionSelector(),
                        StorageSelector(),
                        TierSelector(),
                        NewBatteryOption(),

                        e('div', { className: 'mt-8' },
                            Button({
                                onClick: addToCart,
                                className: 'w-full text-lg py-4'
                            }, t('add_to_cart', 'Add to Cart'))
                        )
                    )
                ),

                FrequentlyBoughtTogether(),
                ProductTabs()
            );
        }

        // Initialize the app
        var container = document.getElementById('gstore-epp-shadow-host');
        if (container) {
            var shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });

            // Add styles to shadow DOM
            var style = document.createElement('style');
            style.textContent = `
                @import url('/wp-content/plugins/gstore-epp/assets/css/tw.css');
                @import url('/wp-content/plugins/gstore-epp/assets/css/app.css');
                
                /* Mobile Layout Fixes - Inside Shadow DOM - FIXED */
                @media (max-width: 768px) {
                    .gstore-app {
                        padding: 0.75rem;
                        margin: 0;
                        max-width: 100vw;
                        overflow-x: hidden;
                    }
                    
                    .epp-product-header {
                        text-align: center;
                        margin-bottom: 1.5rem;
                    }
                    
                    .epp-condition-selector,
                    .epp-storage-selector,
                    .epp-color-selector {
                        margin-bottom: 1rem;
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    
                    .epp-tabs-panel {
                        margin-top: 1rem;
                        padding: 1rem;
                    }
                    
                    .grid-cols-1.lg\\:grid-cols-2 {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            shadowRoot.appendChild(style);

            var appRoot = document.createElement('div');
            appRoot.id = 'gstore-react-root';
            shadowRoot.appendChild(appRoot);

            var root = ReactDOM.createRoot ? ReactDOM.createRoot(appRoot) : null;
            if (root) {
                root.render(React.createElement(ProductApp));
            } else {
                ReactDOM.render(React.createElement(ProductApp), appRoot);
            }
        }
    }

    // Auto-mount when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();