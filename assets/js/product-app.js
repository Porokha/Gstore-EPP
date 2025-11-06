(function(){
    console.log('Gstore EPP: product-app.js v4.2.0 - ORIGINAL DESKTOP + NEW MOBILE ORDER');

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

            var _s8 = useState(null); // Changed: tabs closed by default on mobile
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

            // Load pricing
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

            // Load specs
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/compare-specs?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setCurrentSpecs(j.specs || {}); }
                }).catch(function(e){ console.error('specs fetch failed', e); });
            }, []);

            // Load warranty
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

            // Load compare specs
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

            // Apply default tier
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

                if (cur.deviceType==='phone' && newBat){
                    var nb = pr['new_battery']||{};
                    var add = parseFloat((nb.sale && nb.sale!=='') ? nb.sale : (nb.regular||0));
                    if (isFinite(add)) base4 += add;
                }

                return {base:base4||0, reg:r||0, sale:(s>0 && s<r)?s:null, hasSale:(s>0 && s<r)};
            }, [cur, rules, tier, newBat, cond]);

            var batteryPrice = useMemo(function(){
                if (!rules || !rules.exists || !rules.pricing) return 0;
                var nb = rules.pricing['new_battery']||{};
                return parseFloat((nb.sale && nb.sale!=='') ? nb.sale : (nb.regular||0));
            }, [rules]);

            var fbtTotal = useMemo(function(){
                var total = 0;
                selectedFBT.forEach(function(id){
                    var item = fbt.find(function(x){ return Number(x.id)===Number(id); });
                    if (item) total += parseFloat(item.price||0);
                });
                return total;
            }, [selectedFBT, fbt]);

            var grandTotal = priceBlock.base + fbtTotal + (newBat ? batteryPrice : 0);

            function addToCart(nextUrl){
                var fd = new FormData();
                fd.append('action', 'gstore_epp_add_to_cart');
                fd.append('nonce', BOOT.ajax.nonce);
                fd.append('product_id', cur.productId);
                fd.append('quantity', 1);
                fetch(BOOT.ajax.url, { method:'POST', body:fd, credentials:'same-origin' })
                    .then(function(r){ return r.json(); })
                    .then(function(res){
                        if (res && res.success){ window.location.href = nextUrl; }
                        else { alert('Failed to add to cart'); console.error(res); }
                    })
                    .catch(function(err){ console.error(err); alert('Failed to add to cart'); });
            }

            function CondButton(lbl, key, enabled){
                var active = (cond===key);
                var cls = "flex-1 text-center py-2 text-sm font-medium transition-all ";
                if (!enabled) {
                    cls += "bg-gray-100 text-gray-400 cursor-not-allowed";
                } else if (active) {
                    cls += "bg-blue-600 text-white";
                } else {
                    cls += "bg-white text-gray-700 hover:bg-blue-50";
                }
                return e("button",{
                    className:cls,
                    disabled:!enabled,
                    onClick:function(){ if(enabled) setCond(key); }
                }, lbl);
            }

            function toggleFBT(id){
                setSelectedFBT(function(prev){
                    var found = prev.indexOf(id);
                    if (found >= 0) {
                        var next = prev.slice();
                        next.splice(found, 1);
                        return next;
                    } else {
                        return prev.concat([id]);
                    }
                });
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

            // Icons
            function TruckIcon(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("path",{key:1,d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}),e("path",{key:2,d:"M15 18H9"}),e("path",{key:3,d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"}),e("circle",{key:4,cx:17,cy:18,r:2}),e("circle",{key:5,cx:7,cy:18,r:2})]); }
            function ShieldIcon(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("path",{key:1,d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}),e("path",{key:2,d:"m9 12 2 2 4-4"})]); }
            function BatteryIcon(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("rect",{key:1,width:16,height:10,x:2,y:7,rx:2,ry:2}),e("line",{key:2,x1:22,x2:22,y1:11,y2:13})]); }
            function InfoIcon(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("path",{key:1,d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}),e("line",{key:2,x1:12,x2:12,y1:16,y2:12}),e("line",{key:3,x1:12,x2:12.01,y1:8,y2:8})]); }
            function CartIcon(){ return e("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("circle",{key:1,cx:9,cy:21,r:1}),e("circle",{key:2,cx:20,cy:21,r:1}),e("path",{key:3,d:"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"})]); }
            function CoinsIcon(){ return e("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("circle",{key:1,cx:8,cy:8,r:6}),e("path",{key:2,d:"M18.09 10.37A6 6 0 1 1 10.34 18"}),e("path",{key:3,d:"M7 6h1v4"}),e("path",{key:4,d:"m16.71 13.88.7.71-2.82 2.82"})]); }
            function ChevronDownIcon(){ return e("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("path",{d:"m6 9 6 6 6-6"})]); }
            function ChevronUpIcon(){ return e("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2},[e("path",{d:"m18 15-6-6-6 6"})]); }

            var shippingTime = BOOT.shippingTime || '2–3 business days';
            var conditionNewText = t('condition_new', 'NEW');
            var conditionUsedText = t('condition_used', 'USED (A)');
            var currentConditionText = cond === 'new' ? conditionNewText : conditionUsedText;

            // Collapsible Tab Component (for mobile)
            function CollapsibleTab(props){
                var isOpen = activeTab === props.tabKey;
                var toggle = function(){ setActiveTab(isOpen ? null : props.tabKey); };

                return e("div",{className:"border border-gray-200 rounded-lg mb-3 overflow-hidden"},[
                    e("button",{
                        key:"header",
                        className:"w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors",
                        onClick:toggle
                    },[
                        e("span",{key:"title",className:"font-medium text-sm"},props.title),
                        e("span",{key:"icon"}, isOpen ? e(ChevronUpIcon) : e(ChevronDownIcon))
                    ]),
                    isOpen && e("div",{key:"content",className:"p-4 bg-white"},props.children)
                ]);
            }

            // ORIGINAL DESKTOP LAYOUT + NEW MOBILE ORDER
            return e("div",{className:"min-h-screen bg-white pb-32"},[
                e("div",{key:"main",className:"max-w-7xl mx-auto"},[
                    // MOBILE ONLY: Title first
                    e("div",{key:"mobile-title",className:"lg:hidden px-4 pt-4"},[
                        e("h1",{className:"text-xl font-semibold mb-2"}, cur.title || BOOT.title || "Product")
                    ]),

                    // DESKTOP: Original 2-column grid | MOBILE: Stacked
                    e("div",{className:"p-6 grid lg:grid-cols-2 gap-8"},[
                        // LEFT COLUMN (Desktop) / Top section (Mobile)
                        e("div",{key:"left",className:"space-y-6"},[
                            // Hero image
                            e("img",{
                                key:"hero",
                                src:cur.image || BOOT.image,
                                alt:cur.title||"Product",
                                className:"w-full rounded-2xl shadow-md object-cover"
                            }),

                            // Color swatches
                            e("div",{key:"thumbs",className:"flex gap-3 overflow-x-auto"},
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

                            // MOBILE ONLY: Info grid RIGHT AFTER swatches
                            e("div",{key:"mobile-info",className:"lg:hidden grid grid-cols-2 gap-4 text-sm text-gray-700"},[
                                e("div",{key:"ship",className:"flex items-center gap-2"},[
                                    e(TruckIcon),
                                    " " + shippingTime
                                ]),
                                e("div",{key:"warr",className:"flex items-center gap-2"},[
                                    e(ShieldIcon),
                                    " " + t('warranty_text', 'Warranty')
                                ]),
                                e("div",{key:"batt",className:"flex items-center gap-2"},[
                                    e(BatteryIcon),
                                    " 100%"
                                ]),
                                e("div",{key:"cond",className:"flex items-center gap-2"},[
                                    e(InfoIcon),
                                    " " + currentConditionText
                                ])
                            ]),

                            // MOBILE ONLY: Storage + Condition RIGHT AFTER info grid
                            e("div",{key:"mobile-selectors",className:"lg:hidden space-y-4"},[
                                // Storage
                                e("div",{key:"storage"},[
                                    e("h3",{className:"text-sm font-semibold mb-2"},t('storage_options_text', 'Storage Options')),
                                    e("div",{className:"flex items-center border border-gray-200 rounded-lg overflow-hidden"},
                                        ALL_STORAGES.map(function(st){
                                            var available = storages[st];
                                            var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                            var cls = "flex-1 text-center py-2 text-sm font-medium transition-all ";
                                            if (!available) {
                                                cls += "bg-gray-100 text-gray-400 cursor-not-allowed";
                                            } else if (active) {
                                                cls += "bg-blue-600 text-white";
                                            } else {
                                                cls += "bg-white text-gray-700 hover:bg-blue-50";
                                            }
                                            return e("button",{
                                                key:st,
                                                className:cls,
                                                disabled:!available,
                                                onClick:function(){ if(available) switchStorage(st); }
                                            }, st);
                                        })
                                    )
                                ]),

                                // Condition
                                e("div",{key:"condition"},[
                                    e("h3",{className:"text-sm font-semibold mb-2"},t('condition_label', 'Condition')),
                                    e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden mb-3"},[
                                        CondButton(conditionNewText,'new', avail.hasNew),
                                        CondButton(conditionUsedText,'used', avail.hasUsed)
                                    ]),

                                    // Battery tiers (if USED)
                                    cond==='used' && cur.deviceType==='phone' && rules && rules.exists &&
                                    e("div",{},[
                                        e("div",{key:"tiers",className:"flex border border-gray-200 rounded-lg overflow-hidden mb-3"},
                                            USED_TIERS.map(function(t){
                                                var pr = rules.pricing || {};
                                                var row = pr[t] || {};
                                                var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                                var active = (tier===t);
                                                var cls = "flex-1 text-center py-2 text-xs font-medium transition-all ";
                                                if (active) cls += "bg-green-600 text-white";
                                                else if (enabled) cls += "bg-white text-gray-700 hover:bg-green-50 cursor-pointer";
                                                else cls += "bg-gray-100 text-gray-400 cursor-not-allowed";

                                                return e("button",{
                                                    key:t,
                                                    className:cls,
                                                    disabled:!enabled,
                                                    onClick:function(){ if(enabled) setTier(t); }
                                                }, t+'%');
                                            })
                                        ),

                                        // New battery add-on
                                        (function(){
                                            var nb = (rules.pricing||{})['new_battery']||{};
                                            var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                            if (!hasPrice) return null;

                                            return e("button",{
                                                    key:"newbat",
                                                    className:"w-full py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (newBat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                                    onClick:function(){ setNewBat(!newBat); }
                                                }, newBat
                                                    ? t('new_battery_added', '✓ New Battery Added (+₾{amount})', {amount: batteryPrice.toFixed(2)})
                                                    : t('add_new_battery', '+ Add New Battery (+₾{amount})', {amount: batteryPrice.toFixed(2)})
                                            );
                                        })()
                                    ])
                                ])
                            ]),

                            // Description (both mobile + desktop)
                            e("div",{key:"desc",className:"text-gray-700 text-sm leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-4"},[
                                e("p",{},"Experience next-level performance, breathtaking photography, and cutting-edge design with iPhone 14 Pro. A16 Bionic, Dynamic Island, ProMotion 120Hz, and a 48MP camera system.")
                            ]),

                            // DESKTOP: Original tab design | MOBILE: Collapsible tabs
                            e("div",{key:"tabs",className:"space-y-3"},[
                                // Desktop tabs (original design)
                                e("div",{className:"hidden lg:block"},[
                                    e("div",{className:"bg-gray-100 p-1 rounded-lg flex gap-1 mb-4"},[
                                        [
                                            ['specifications', t('specifications_tab', 'Specifications')],
                                            ['warranty', t('warranty_tab', 'Warranty')],
                                            ['compare', t('compare_tab', 'Compare')]
                                        ]
                                    ].map(function(tabs){
                                        return tabs.map(function(tab){
                                            var active = activeTab===tab[0];
                                            var cls = "flex-1 text-center py-2 px-4 text-sm font-medium rounded-md cursor-pointer transition-all "+(active?"bg-white text-gray-900 shadow-sm":"text-gray-600 hover:text-gray-900");
                                            return e("button",{key:tab[0],className:cls,onClick:function(){ setActiveTab(tab[0]); }}, tab[1]);
                                        });
                                    })),

                                    // Desktop tab content
                                    e("div",{className:"pt-4"},[
                                        activeTab==='specifications' && e("ul",{key:"specs",className:"list-disc pl-5 space-y-1 text-gray-700"},[
                                            e("li",{key:1},"Display: 6.1\" Super Retina XDR OLED, 2556×1179, ProMotion 120Hz, Always-On"),
                                            e("li",{key:2},"Chip: A16 Bionic (6-core CPU, 5-core GPU, 16-core Neural Engine)"),
                                            e("li",{key:3},"Memory: 6GB; Storage: 128GB / 256GB / 512GB / 1TB"),
                                            e("li",{key:4},"Cameras: 48MP main, 12MP ultra-wide, 12MP telephoto; 12MP TrueDepth front"),
                                            e("li",{key:5},"Connectivity: 5G, Wi-Fi 6, Bluetooth 5.3, UWB, NFC"),
                                            e("li",{key:6},"Charging: MagSafe up to 15W, Qi up to 7.5W")
                                        ]),

                                        activeTab==='warranty' && e("div",{key:"warranty",className:"text-sm text-gray-700"},[
                                            warrantyText
                                                ? e("div",{dangerouslySetInnerHTML:{__html:warrantyText}})
                                                : e("p",{},"Loading warranty information...")
                                        ]),

                                        activeTab==='compare' && e("div",{key:"compare",className:"grid grid-cols-2 gap-8"},[
                                            e("div",{key:"left"},[
                                                e("h3",{className:"font-semibold mb-2"},"iPhone 14 Pro"),
                                                scoreKeys.map(function(k){ return CompareRow(k, !!compareProduct); })
                                            ]),

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
                                ]),

                                // Mobile collapsible tabs
                                e("div",{className:"lg:hidden"},[
                                    e(CollapsibleTab,{
                                        key:"specs",
                                        tabKey:"specifications",
                                        title:t('specifications_tab', 'Specifications')
                                    },[
                                        e("ul",{key:"specs",className:"list-disc pl-5 space-y-1 text-gray-700 text-sm"},[
                                            e("li",{key:1},"Display: 6.1\" Super Retina XDR OLED, 2556×1179, ProMotion 120Hz, Always-On"),
                                            e("li",{key:2},"Chip: A16 Bionic (6-core CPU, 5-core GPU, 16-core Neural Engine)"),
                                            e("li",{key:3},"Memory: 6GB; Storage: 128GB / 256GB / 512GB / 1TB"),
                                            e("li",{key:4},"Cameras: 48MP main, 12MP ultra-wide, 12MP telephoto; 12MP TrueDepth front"),
                                            e("li",{key:5},"Connectivity: 5G, Wi-Fi 6, Bluetooth 5.3, UWB, NFC"),
                                            e("li",{key:6},"Charging: MagSafe up to 15W, Qi up to 7.5W")
                                        ])
                                    ]),

                                    e(CollapsibleTab,{
                                        key:"warranty",
                                        tabKey:"warranty",
                                        title:t('warranty_tab', 'Warranty')
                                    },[
                                        e("div",{key:"warranty",className:"text-sm text-gray-700"},
                                            warrantyText
                                                ? e("div",{dangerouslySetInnerHTML:{__html:warrantyText}})
                                                : e("p",{},"Loading warranty information...")
                                        )
                                    ]),

                                    e(CollapsibleTab,{
                                        key:"compare",
                                        tabKey:"compare",
                                        title:t('compare_tab', 'Compare')
                                    },[
                                        e("div",{key:"compare",className:"grid grid-cols-2 gap-8"},[
                                            e("div",{key:"left"},[
                                                e("h3",{className:"font-semibold mb-2 text-sm"},"iPhone 14 Pro"),
                                                scoreKeys.map(function(k){ return CompareRow(k, !!compareProduct); })
                                            ]),
                                            e("div",{key:"right",className:"relative"},[
                                                compareProduct ?
                                                    e("div",{},[
                                                        e("div",{className:"flex items-center justify-between mb-2"},[
                                                            e("h3",{key:"title",className:"font-semibold text-sm"},"Product #"+compareProduct),
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
                                                        e("span",{key:"label",className:"font-medium text-xs"},t('add_to_compare', 'Add Product to Compare'))
                                                    ]),

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
                                                                    className:"p-2 hover:bg-blue-50 cursor-pointer rounded-md text-sm",
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
                            ])
                        ]),

                        // RIGHT COLUMN (Desktop) - Original layout
                        e("div",{key:"right",className:"space-y-5"},[
                            // Title (desktop only)
                            e("h1",{key:"title",className:"hidden lg:block text-2xl font-semibold"},
                                cur.title || BOOT.title || "Product"),
                            e("hr",{key:"hr",className:"hidden lg:block my-4 border-gray-200"}),

                            // Price (desktop only)
                            e("div",{key:"price",className:"hidden lg:flex items-center gap-3 flex-wrap"},[
                                e("div",{key:"prices",className:"flex flex-col"},[
                                    priceBlock.hasSale && e("span",{key:"reg",className:"text-[12px] text-gray-400 line-through"}, gel(priceBlock.reg)),
                                    e("span",{key:"sale",className:"text-3xl font-bold " + (priceBlock.hasSale ? "text-red-600" : "text-gray-900")},
                                        gel(priceBlock.hasSale ? priceBlock.sale : priceBlock.base))
                                ]),
                                e("p",{key:"inst",className:"text-gray-600 flex items-center gap-1 text-base"},[
                                    e(CoinsIcon,{key:"icon"}),
                                    " " + t('installment_text', 'From ₾{amount}/month for 12 months', {
                                        amount: (grandTotal/12).toFixed(2)
                                    })
                                ])
                            ]),

                            // Info grid (desktop only)
                            e("div",{key:"info",className:"hidden lg:grid grid-cols-2 gap-4 text-sm text-gray-700 mt-2"},[
                                e("div",{key:"ship",className:"flex items-center gap-2"},[
                                    e(TruckIcon),
                                    " " + shippingTime
                                ]),
                                e("div",{key:"warr",className:"flex items-center gap-2"},[
                                    e(ShieldIcon),
                                    " " + t('warranty_text', 'Warranty')
                                ]),
                                e("div",{key:"batt",className:"flex items-center gap-2"},[
                                    e(BatteryIcon),
                                    " 100%"
                                ]),
                                e("div",{key:"cond",className:"flex items-center gap-2"},[
                                    e(InfoIcon),
                                    " " + currentConditionText
                                ])
                            ]),

                            // Storage (desktop only)
                            e("div",{key:"storage",className:"hidden lg:block mt-4"},[
                                e("h3",{className:"text-sm font-semibold mb-2"},t('storage_options_text', 'Storage Options')),
                                e("div",{className:"flex items-center border border-gray-200 rounded-lg overflow-hidden"},
                                    ALL_STORAGES.map(function(st){
                                        var available = storages[st];
                                        var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                        var cls = "flex-1 text-center py-2 text-sm font-medium transition-all ";
                                        if (!available) {
                                            cls += "bg-gray-100 text-gray-400 cursor-not-allowed";
                                        } else if (active) {
                                            cls += "bg-blue-600 text-white";
                                        } else {
                                            cls += "bg-white text-gray-700 hover:bg-blue-50";
                                        }
                                        return e("button",{
                                            key:st,
                                            className:cls,
                                            disabled:!available,
                                            onClick:function(){ if(available) switchStorage(st); }
                                        }, st);
                                    })
                                )
                            ]),

                            // Condition (desktop only)
                            e("div",{key:"condition",className:"hidden lg:block mt-4"},[
                                e("h3",{className:"text-sm font-semibold mb-2"},t('condition_label', 'Condition')),
                                e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden mb-3"},[
                                    CondButton(conditionNewText,'new', avail.hasNew),
                                    CondButton(conditionUsedText,'used', avail.hasUsed)
                                ]),

                                cond==='used' && cur.deviceType==='phone' && rules && rules.exists &&
                                e("div",{},[
                                    e("div",{key:"tiers",className:"flex border border-gray-200 rounded-lg overflow-hidden"},
                                        USED_TIERS.map(function(t){
                                            var pr = rules.pricing || {};
                                            var row = pr[t] || {};
                                            var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                            var active = (tier===t);
                                            var cls = "flex-1 text-center py-2 text-sm font-medium transition-all ";
                                            if (active) cls += "bg-green-600 text-white";
                                            else if (enabled) cls += "bg-white text-gray-700 hover:bg-green-50 cursor-pointer";
                                            else cls += "bg-gray-100 text-gray-400 cursor-not-allowed";

                                            return e("button",{
                                                key:t,
                                                className:cls,
                                                disabled:!enabled,
                                                onClick:function(){ if(enabled) setTier(t); }
                                            }, t+'%');
                                        })
                                    ),

                                    (function(){
                                        var nb = (rules.pricing||{})['new_battery']||{};
                                        var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                        if (!hasPrice) return null;

                                        return e("button",{
                                                key:"newbat",
                                                className:"w-full mt-3 py-2 px-4 rounded-lg border text-sm font-medium transition-all " + (newBat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"),
                                                onClick:function(){ setNewBat(!newBat); }
                                            }, newBat
                                                ? t('new_battery_added', '✓ New Battery Added (+₾{amount})', {amount: batteryPrice.toFixed(2)})
                                                : t('add_new_battery', '+ Add New Battery (+₾{amount})', {amount: batteryPrice.toFixed(2)})
                                        );
                                    })()
                                ])
                            ]),

                            // Buttons (desktop only)
                            e("div",{key:"buttons",className:"hidden lg:flex gap-3 mt-6"},[
                                e(Button,{
                                    key:"cart",
                                    className:"flex-1",
                                    onClick:function(){ addToCart('/cart/'); }
                                }, t('add_to_cart', 'Add to Cart')),
                                e(Button,{
                                    key:"buy",
                                    variant:"outline",
                                    className:"flex-1",
                                    onClick:function(){ addToCart('/checkout/'); }
                                }, t('buy_now', 'Buy Now'))
                            ]),

                            // FBT
                            fbt.length>0 && e("div",{key:"fbt",className:"shadow-sm border rounded-lg p-4"},[
                                e("h3",{key:"title",className:"text-base font-semibold mb-4"},t('fbt_title', 'Frequently Bought Together')),
                                e("div",{key:"grid",className:"grid grid-cols-3 sm:grid-cols-3 gap-3"},
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
                                            e("p",{key:"name",className:"font-medium flex-1 min-h-[2.5rem] flex items-center justify-center text-xs"},item.title),
                                            e("button",{
                                                    key:"btn",
                                                    className:"mt-2 w-full text-xs py-1 rounded-md border transition-all "+(isSelected?"bg-blue-600 text-white":"bg-white text-gray-700 hover:bg-blue-100"),
                                                    onClick:function(){ toggleFBT(item.id); }
                                                }, isSelected
                                                    ? t('added_button', '✓ Added', {price: item.price})
                                                    : t('add_button', '+ Add', {price: item.price})
                                            )
                                        ]);
                                    })
                                )
                            ])
                        ])
                    ])
                ]),

                // STICKY BOTTOM BAR (Mobile + Desktop)
                e("div",{
                    key:"sticky-bar",
                    className:"fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg",
                    style:{
                        zIndex: '999999',
                        paddingBottom:'env(safe-area-inset-bottom)'
                    }
                },[
                    e("div",{className:"max-w-7xl mx-auto px-4 py-3"},[
                        e("div",{className:"flex items-center gap-3"},[
                            // Price
                            e("div",{key:"price",className:"flex flex-col flex-1"},[
                                priceBlock.hasSale && e("span",{key:"reg",className:"text-xs text-gray-400 line-through"}, gel(priceBlock.reg)),
                                e("span",{
                                    key:"sale",
                                    className:"text-xl font-bold " + (priceBlock.hasSale ? "text-red-600" : "text-gray-900")
                                }, gel(priceBlock.hasSale ? priceBlock.sale : priceBlock.base))
                            ]),

                            // Cart button
                            e("button",{
                                key:"cart",
                                className:"bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 lg:min-w-[140px]",
                                onClick:function(){ addToCart('/cart/'); }
                            },[
                                e(CartIcon,{key:"icon"}),
                                e("span",{key:"text",className:"hidden lg:inline"},t('add_to_cart', 'Add to Cart'))
                            ]),

                            // Buy Now button
                            e("button",{
                                key:"buy",
                                className:"bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-6 rounded-lg transition-all lg:min-w-[140px]",
                                onClick:function(){ addToCart('/checkout/'); }
                            }, t('buy_now', 'Buy Now'))
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
            style.textContent = `*,:before,:after{box-sizing:border-box;border:0 solid #e5e7eb}:before,:after{--tw-content:""}html,:host{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;line-height:inherit}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,[type=button],[type=reset],[type=submit]{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}textarea{resize:vertical}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=button]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}*,:before,:after{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000}::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000}.fixed{position:fixed}.relative{position:relative}.bottom-0{bottom:0}.left-0{left:0}.right-0{right:0}.z-50{z-index:50}.mx-auto{margin-left:auto;margin-right:auto}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}.mb-4{margin-bottom:1rem}.ml-2{margin-left:.5rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.my-4{margin-top:1rem;margin-bottom:1rem}.flex{display:flex}.grid{display:grid}.hidden{display:none}.h-1{height:.25rem}.h-16{height:4rem}.h-24{height:6rem}.h-4{height:1rem}.min-h-\\[2\\.5rem\\]{min-height:2.5rem}.min-h-screen{min-height:100vh}.w-16{width:4rem}.w-4{width:1rem}.w-64{width:16rem}.w-full{width:100%}.max-w-7xl{max-width:80rem}.flex-1{flex:1 1 0%}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.list-disc{list-style-type:disc}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.gap-1{gap:.25rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-8{gap:2rem}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.25rem * var(--tw-space-y-reverse))}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.75rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.75rem * var(--tw-space-y-reverse))}.space-y-4>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1rem * var(--tw-space-y-reverse))}.space-y-5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.25rem * var(--tw-space-y-reverse))}.space-y-6>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.5rem * var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.rounded-2xl{border-radius:1rem}.border{border-width:1px}.border-2{border-width:2px}.border-t{border-top-width:1px}.border-dashed{border-style:dashed}.border-blue-500{--tw-border-opacity:1;border-color:rgb(59 130 246/var(--tw-border-opacity))}.border-blue-600{--tw-border-opacity:1;border-color:rgb(37 99 235/var(--tw-border-opacity))}.border-gray-100{--tw-border-opacity:1;border-color:rgb(243 244 246/var(--tw-border-opacity))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235/var(--tw-border-opacity))}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219/var(--tw-border-opacity))}.bg-blue-100{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.bg-blue-50{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.bg-blue-600{--tw-bg-opacity:1;background-color:rgb(37 99 235/var(--tw-bg-opacity))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity))}.bg-green-50{--tw-bg-opacity:1;background-color:rgb(240 253 244/var(--tw-bg-opacity))}.bg-green-600{--tw-bg-opacity:1;background-color:rgb(22 163 74/var(--tw-bg-opacity))}.bg-red-400{--tw-bg-opacity:1;background-color:rgb(248 113 113/var(--tw-bg-opacity))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity))}.object-cover{object-fit:cover}.p-1{padding:.25rem}.p-10{padding:2.5rem}.p-2{padding:.5rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}.pb-32{padding-bottom:8rem}.pl-5{padding-left:1.25rem}.pt-4{padding-top:1rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-\\[10px\\]{font-size:10px}.text-\\[12px\\]{font-size:12px}.text-base{font-size:1rem;line-height:1.5rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.leading-relaxed{line-height:1.625}.text-blue-600{--tw-text-opacity:1;color:rgb(37 99 235/var(--tw-text-opacity))}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128/var(--tw-text-opacity))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}.text-green-600{--tw-text-opacity:1;color:rgb(22 163 74/var(--tw-text-opacity))}.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.line-through{text-decoration-line:line-through}.shadow{--tw-shadow:0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgb(0 0 0/.1),0 4px 6px -4px rgb(0 0 0/.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px rgb(0 0 0/.1),0 2px 4px -2px rgb(0 0 0/.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgb(0 0 0/.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.outline-none{outline:2px solid transparent;outline-offset:2px}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.hover\\:bg-blue-100:hover{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.hover\\:bg-blue-50:hover{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.hover\\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.hover\\:bg-gray-100:hover{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity))}.hover\\:bg-gray-50:hover{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity))}.hover\\:bg-green-50:hover{--tw-bg-opacity:1;background-color:rgb(240 253 244/var(--tw-bg-opacity))}.hover\\:bg-green-700:hover{--tw-bg-opacity:1;background-color:rgb(21 128 61/var(--tw-bg-opacity))}.hover\\:border-blue-400:hover{--tw-border-opacity:1;border-color:rgb(96 165 250/var(--tw-border-opacity))}.hover\\:text-blue-600:hover{--tw-text-opacity:1;color:rgb(37 99 235/var(--tw-text-opacity))}.hover\\:text-gray-900:hover{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}@media(min-width:640px){.sm\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1024px){.lg\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.lg\\:hidden{display:none}.lg\\:block{display:block}.lg\\:flex{display:flex}.lg\\:grid{display:grid}.lg\\:inline{display:inline}.lg\\:min-w-\\[140px\\]{min-width:140px}}`;
            shadow.appendChild(style);

            var appRoot = document.createElement('div');
            shadow.appendChild(appRoot);

            ReactDOM.createRoot(appRoot).render(e(ProductApp));
            console.log('Gstore EPP v4.2.0: ORIGINAL DESKTOP + NEW MOBILE ORDER ✅');
        } catch(error) {
            console.error('Gstore EPP: Render failed', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
