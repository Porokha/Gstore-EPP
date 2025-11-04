(function(){
    console.log('Gstore EPP: product-app.js loaded');

    function money(n){ var x = Number(n||0); return isFinite(x) ? x.toFixed(2) : "0.00"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
        console.log('Gstore EPP: mount() called');

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

        console.log('Gstore EPP: Starting full app');

        var e = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useMemo = React.useMemo;

        var USED_TIERS = ['80-85','85-90','90-95','95-100'];

        function Button(props){
            var base = "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium transition-all";
            var variant = props.variant==="outline" ? " border-2 border-gray-300 text-gray-800 bg-white hover:bg-gray-50" : " bg-blue-600 text-white hover:bg-blue-700";
            var cn = (props.className||"");
            var p = Object.assign({}, props); delete p.className; delete p.variant;
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

            var _s7 = useState({});
            var fbtSelected = _s7[0]; var setFbtSelected = _s7[1];

            var _s8 = useState('specifications');
            var activeTab = _s8[0]; var setActiveTab = _s8[1];

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
                    if (j && j.exists && j.default_condition){
                        setTier(j.default_condition);
                    }
                }).catch(function(e){ console.error('pricing fetch failed', e); });
            }, []);

            // Load FBT
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/fbt?product_id=' + BOOT.productId;
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setFbt(j.products||[]); }
                }).catch(function(e){ console.error('fbt fetch failed', e); });
            }, []);

            var _s9 = useState((cur.condition==='new')?'new':'used');
            var cond = _s9[0]; var setCond = _s9[1];

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
                var seen = {};
                var list = [];
                siblings.forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    var match = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    if (match && p.storage){
                        var key = String(p.storage).toLowerCase();
                        if (!seen[key]){ seen[key]=true; list.push(p.storage); }
                    }
                });
                return list;
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
                setCond(((p.condition||'').toLowerCase()==='new') ? 'new':'used');
                setNewBat(false);
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

            var priceBlock = useMemo(function(){
                var reg = parseFloat(cur.regular||cur.price||0);
                var sale = parseFloat(cur.sale||0);
                var showSale = (sale>0 && sale<reg) ? sale : null;

                if (!rules || !rules.exists || cond==='new'){
                    var base = showSale!=null ? sale : reg;
                    return {base:base||0, reg:reg||0, sale:showSale};
                }

                var pr = rules.pricing||{};
                if (!tier){
                    var base2 = showSale!=null ? sale : reg;
                    return {base:base2||0, reg:reg||0, sale:showSale};
                }

                var chosen = pr[tier] || {};
                if (!chosen.regular && !chosen.sale){
                    var base3 = showSale!=null ? sale : reg;
                    return {base:base3||0, reg:reg||0, sale:showSale};
                }

                var r = parseFloat(chosen.regular||0);
                var s = parseFloat(chosen.sale||0);
                var base4 = (s>0 && s<r) ? s : r;

                if (cur.deviceType==='phone' && newBat){
                    var nb = pr['new_battery']||{};
                    var add = parseFloat((nb.sale && nb.sale!=='') ? nb.sale : (nb.regular||0));
                    if (isFinite(add)) base4 += add;
                }

                return {base:base4||0, reg:r||0, sale:(s>0 && s<r)?s:null};
            }, [cur, rules, tier, newBat, cond]);

            var fbtTotal = useMemo(function(){
                var total = priceBlock.base || 0;
                Object.keys(fbtSelected).forEach(function(id){
                    if (fbtSelected[id]){
                        var item = fbt.find(function(x){ return String(x.id)===String(id); });
                        if (item) total += parseFloat(item.price||0);
                    }
                });
                return total;
            }, [fbtSelected, fbt, priceBlock]);

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
                var cls = "flex-1 text-center py-3 px-4 text-sm font-semibold transition-all ";
                cls += active ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50";
                if (!enabled) cls += " opacity-40 cursor-not-allowed";
                return e("button",{
                    className:cls,
                    disabled:!enabled,
                    onClick:function(){ if(enabled) setCond(key); }
                }, lbl);
            }

            return e("div",{className:"bg-white"},[
                // Main product section
                e("div",{key:"main",className:"max-w-7xl mx-auto px-6 py-8"},[
                    e("div",{className:"grid lg:grid-cols-2 gap-12"},[
                        // LEFT: Image + Color Swatches
                        e("div",{key:"L",className:"space-y-4"},[
                            e("div",{className:"bg-white rounded-2xl p-4 shadow-sm border border-gray-100"},[
                                e("img",{
                                    src:cur.image || BOOT.image || "https://via.placeholder.com/600x600?text=Product",
                                    alt:cur.title||"Product",
                                    className:"w-full h-auto rounded-xl object-contain"
                                })
                            ]),

                            // Mini color swatches row
                            e("div",{className:"flex gap-3 overflow-x-auto pb-2"},
                                colors.map(function(c){
                                    var active = (String(c.id)===String(cur.productId));
                                    var cls = "flex-shrink-0 h-24 w-24 rounded-lg cursor-pointer border-2 object-cover transition-all "+(active?"border-blue-600 ring-2 ring-blue-200":"border-gray-200 hover:border-blue-400");
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

                        // RIGHT: Product Info
                        e("div",{key:"R",className:"space-y-6"},[
                            // Title
                            e("h1",{className:"text-3xl font-bold text-gray-900"}, cur.title || BOOT.title || "Product"),

                            // Price
                            e("div",{className:"flex items-baseline gap-4"},[
                                priceBlock.reg>0 && e("span",{key:"reg",className:"text-lg text-gray-400 line-through"}, gel(priceBlock.reg)),
                                e("span",{key:"price",className:"text-4xl font-bold text-red-600"},
                                    gel(priceBlock.sale!=null ? priceBlock.sale : priceBlock.base)),
                                e("span",{key:"inst",className:"text-sm text-gray-500"},"From ₾99.92/month for 12 months")
                            ]),

                            // Info icons row
                            e("div",{className:"grid grid-cols-2 gap-3 py-4 border-y border-gray-200"},[
                                e("div",{key:"ship",className:"flex items-center gap-2 text-sm text-gray-700"},[
                                    e("span",{className:"text-lg"},"📦"),
                                    "Shipping: 2–3 business days"
                                ]),
                                e("div",{key:"warr",className:"flex items-center gap-2 text-sm text-gray-700"},[
                                    e("span",{className:"text-lg"},"🛡️"),
                                    "Warranty: Available"
                                ]),
                                e("div",{key:"batt",className:"flex items-center gap-2 text-sm text-gray-700"},[
                                    e("span",{className:"text-lg"},"🔋"),
                                    "Battery Health: 100%"
                                ]),
                                e("div",{key:"cond",className:"flex items-center gap-2 text-sm text-gray-700"},[
                                    e("span",{className:"text-lg"},"ℹ️"),
                                    "Condition: "+(cond==='new'?'NEW':'USED')
                                ])
                            ]),

                            // Storage Options
                            storages.length>0 && e("div",{key:"storage"},[
                                e("h3",{className:"text-sm font-semibold mb-3 text-gray-800"},"Storage Options"),
                                e("div",{className:"flex gap-2 flex-wrap"},
                                    storages.map(function(st){
                                        var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                        var cls = "px-6 py-3 border-2 rounded-xl text-sm font-semibold transition-all "+(active?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700 border-gray-300 hover:border-blue-400");
                                        return e("button",{key:st,className:cls,onClick:function(){ switchStorage(st); }}, st);
                                    })
                                )
                            ]),

                            // Condition Switcher
                            e("div",{key:"condition"},[
                                e("h3",{className:"text-sm font-semibold mb-3 text-gray-800"},"Condition"),
                                e("div",{className:"flex border-2 border-gray-300 rounded-xl overflow-hidden"},[
                                    CondButton("NEW",'new', avail.hasNew),
                                    CondButton("USED (A)",'used', avail.hasUsed),
                                    (cur.deviceType==='laptop' && CondButton("OPEN BOX",'openbox', avail.hasOpen))
                                ])
                            ]),

                            // Battery Health (phones + used only)
                            (cond==='used' && cur.deviceType==='phone' && rules && rules.exists &&
                                e("div",{key:"battery"},[
                                    e("h4",{className:"text-sm font-semibold mb-3 text-gray-800"},"Battery Health"),
                                    e("div",{className:"flex border-2 border-gray-300 rounded-xl overflow-hidden"},
                                        USED_TIERS.map(function(t){
                                            var pr = rules.pricing || {};
                                            var row = pr[t] || {};
                                            var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                            var active = (tier===t);
                                            var cls = "flex-1 text-center py-3 text-xs font-semibold transition-all ";
                                            if (active) cls += "bg-green-600 text-white";
                                            else if (enabled) cls += "bg-white text-gray-700 hover:bg-green-50 cursor-pointer";
                                            else cls += "bg-gray-100 text-gray-400 cursor-not-allowed";

                                            return e("button",{
                                                key:t,
                                                className:cls,
                                                disabled:!enabled,
                                                onClick:function(){ if(enabled) setTier(t); }
                                            }, t+"%");
                                        })
                                    ),

                                    (function(){
                                        var nb = (rules.pricing||{})['new_battery']||{};
                                        var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                        if (!hasPrice) return null;
                                        return e("div",{className:"mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"},[
                                            e("label",{className:"flex items-center gap-2 text-sm font-medium text-gray-700"},[
                                                e("input",{
                                                    type:"checkbox",
                                                    checked:newBat,
                                                    onChange:function(ev){ setNewBat(ev.target.checked); },
                                                    className:"h-4 w-4 accent-green-600"
                                                }),
                                                "Add New Battery"
                                            ])
                                        ]);
                                    })()
                                ])
                            ),

                            // CTA Buttons
                            e("div",{key:"cta",className:"flex gap-4 mt-8"},[
                                e(Button,{
                                    className:"flex-1",
                                    onClick:function(){ addToCart('/cart/'); }
                                },"🛒 Add to Cart "+gel(priceBlock.base||0)),
                                e(Button,{
                                    variant:"outline",
                                    className:"flex-1",
                                    onClick:function(){ addToCart('/checkout/'); }
                                },"Buy Now "+gel(priceBlock.base||0))
                            ])
                        ])
                    ])
                ]),

                // Product Description / Specs Section
                e("div",{key:"desc",className:"bg-gray-50 border-y border-gray-200 py-12 mt-12"},[
                    e("div",{className:"max-w-7xl mx-auto px-6"},[
                        e("div",{className:"grid lg:grid-cols-[300px_1fr] gap-8"},[
                            // Description content
                            e("div",{key:"content",className:"bg-white rounded-xl p-8 shadow-sm"},[
                                e("p",{className:"text-gray-700 leading-relaxed"},
                                    "Experience next-level performance, breathtaking photography, and cutting-edge design with iPhone 14 Pro. A16 Bionic, Dynamic Island, ProMotion 120Hz, and a 48MP camera system."
                                ),

                                // Tabs
                                e("div",{className:"flex gap-6 border-b border-gray-200 mt-8 mb-6"},[
                                    ['specifications','Specifications'],
                                    ['warranty','Warranty'],
                                    ['compare','Compare']
                                ].map(function(tab){
                                    var active = activeTab===tab[0];
                                    var cls = "pb-3 text-sm font-medium cursor-pointer transition-all "+(active?"text-gray-900 border-b-2 border-gray-900":"text-gray-500 hover:text-gray-700");
                                    return e("button",{key:tab[0],className:cls,onClick:function(){ setActiveTab(tab[0]); }}, tab[1]);
                                })),

                                // Tab content
                                activeTab==='specifications' && e("ul",{className:"space-y-3 text-sm text-gray-700"},[
                                    e("li",{key:1},"• Display: 6.1\" Super Retina XDR OLED, 2556×1179, ProMotion 120Hz, Always-On"),
                                    e("li",{key:2},"• Chip: A16 Bionic (6-core CPU, 5-core GPU, 16-core Neural Engine)"),
                                    e("li",{key:3},"• Memory: 6GB; Storage: 128GB / 256GB / 512GB / 1TB"),
                                    e("li",{key:4},"• Cameras: 48MP main, 12MP ultra-wide, 12MP telephoto; 12MP TrueDepth front"),
                                    e("li",{key:5},"• Connectivity: 5G, Wi-Fi 6, Bluetooth 5.3, UWB, NFC"),
                                    e("li",{key:6},"• Charging: MagSafe up to 15W, Qi up to 7.5W")
                                ]),

                                activeTab==='warranty' && e("div",{className:"text-sm text-gray-700"},[
                                    e("p",{key:1,className:"mb-2"},"1 year limited hardware warranty"),
                                    e("p",{key:2},"Extended warranty options available at checkout")
                                ]),

                                activeTab==='compare' && e("div",{className:"text-sm text-gray-700"},[
                                    e("p",{},"Compare this model with iPhone 14, iPhone 13 Pro, and other models in our comparison tool.")
                                ])
                            ]),

                            // FBT Section (RIGHT SIDE)
                            fbt.length>0 && e("div",{key:"fbt",className:"bg-white rounded-xl p-8 shadow-sm"},[
                                e("h3",{className:"text-2xl font-bold mb-6 text-gray-900"},"Frequently Bought Together"),

                                e("div",{className:"space-y-4"},
                                    fbt.map(function(item){
                                        var checked = !!fbtSelected[item.id];
                                        return e("div",{key:item.id,className:"flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-all"},[
                                            e("input",{
                                                type:"checkbox",
                                                checked:checked,
                                                onChange:function(ev){
                                                    var next = Object.assign({}, fbtSelected);
                                                    if (ev.target.checked) next[item.id]=true;
                                                    else delete next[item.id];
                                                    setFbtSelected(next);
                                                },
                                                className:"h-5 w-5 accent-blue-600"
                                            }),
                                            e("img",{src:item.image,alt:item.title,className:"w-16 h-16 object-cover rounded-lg"}),
                                            e("div",{className:"flex-1"},[
                                                e("h4",{className:"text-sm font-semibold text-gray-900"},item.title),
                                                e("p",{className:"text-sm font-bold text-red-600"},gel(item.price))
                                            ])
                                        ]);
                                    })
                                ),

                                e("div",{className:"mt-6 pt-6 border-t border-gray-200 flex items-center justify-between"},[
                                    e("span",{className:"text-sm font-semibold text-gray-700"},"Total:"),
                                    e("span",{className:"text-2xl font-bold text-red-600"},gel(fbtTotal))
                                ]),

                                e("button",{
                                    className:"w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all",
                                    onClick:function(){ alert('Add selected items to cart'); }
                                },"+ Add "+Object.keys(fbtSelected).length+" to Cart")
                            ])
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
            // Create Shadow DOM
            var shadow = host.shadowRoot || host.attachShadow({mode:'open'});

            // Inject Tailwind CSS
            var style = document.createElement('style');
            style.textContent = `*,:before,:after{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246 / .5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246 / .5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }*,:before,:after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}:before,:after{--tw-content:""}html,:host{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji",Segoe UI Symbol,"Noto Color Emoji";font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=button]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]:where(:not([hidden=until-found])){display:none}.absolute{position:absolute}.relative{position:relative}.right-0{right:0}.top-0{top:0}.z-50{z-index:50}.mx-auto{margin-left:auto;margin-right:auto}.my-4{margin-top:1rem;margin-bottom:1rem}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}.mb-6{margin-bottom:1.5rem}.ml-2{margin-left:.5rem}.mr-2{margin-right:.5rem}.mt-1{margin-top:.25rem}.mt-12{margin-top:3rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}.block{display:block}.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.h-1{height:.25rem}.h-16{height:4rem}.h-24{height:6rem}.h-4{height:1rem}.h-5{height:1.25rem}.h-auto{height:auto}.max-h-56{max-height:14rem}.min-h-screen{min-height:100vh}.w-16{width:4rem}.w-24{width:6rem}.w-4{width:1rem}.w-5{width:1.25rem}.w-64{width:16rem}.w-full{width:100%}.max-w-7xl{max-width:80rem}.flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.list-disc{list-style-type:disc}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-baseline{align-items:baseline}.items-center{align-items:center}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.gap-1{gap:.25rem}.gap-12{gap:3rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-6{gap:1.5rem}.gap-8{gap:2rem}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.25rem * var(--tw-space-y-reverse))}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.75rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.75rem * var(--tw-space-y-reverse))}.space-y-4>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1rem * var(--tw-space-y-reverse))}.space-y-5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.25rem * var(--tw-space-y-reverse))}.space-y-6>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.5rem * var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded-2xl{border-radius:1rem}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.border{border-width:1px}.border-2{border-width:2px}.border-b{border-bottom-width:1px}.border-b-2{border-bottom-width:2px}.border-t{border-top-width:1px}.border-y{border-top-width:1px;border-bottom-width:1px}.border-dashed{border-style:dashed}.border-blue-200{--tw-border-opacity:1;border-color:rgb(191 219 254 / var(--tw-border-opacity,1))}.border-blue-400{--tw-border-opacity:1;border-color:rgb(96 165 250 / var(--tw-border-opacity,1))}.border-blue-500{--tw-border-opacity:1;border-color:rgb(59 130 246 / var(--tw-border-opacity,1))}.border-blue-600{--tw-border-opacity:1;border-color:rgb(37 99 235 / var(--tw-border-opacity,1))}.border-gray-100{--tw-border-opacity:1;border-color:rgb(243 244 246 / var(--tw-border-opacity,1))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235 / var(--tw-border-opacity,1))}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219 / var(--tw-border-opacity,1))}.border-gray-900{--tw-border-opacity:1;border-color:rgb(17 24 39 / var(--tw-border-opacity,1))}.bg-blue-50{--tw-bg-opacity:1;background-color:rgb(239 246 255 / var(--tw-bg-opacity,1))}.bg-blue-600{--tw-bg-opacity:1;background-color:rgb(37 99 235 / var(--tw-bg-opacity,1))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgb(243 244 246 / var(--tw-bg-opacity,1))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251 / var(--tw-bg-opacity,1))}.bg-green-500{--tw-bg-opacity:1;background-color:rgb(34 197 94 / var(--tw-bg-opacity,1))}.bg-green-600{--tw-bg-opacity:1;background-color:rgb(22 163 74 / var(--tw-bg-opacity,1))}.bg-red-400{--tw-bg-opacity:1;background-color:rgb(248 113 113 / var(--tw-bg-opacity,1))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255 / var(--tw-bg-opacity,1))}.object-contain{-o-object-fit:contain;object-fit:contain}.object-cover{-o-object-fit:cover;object-fit:cover}.p-1{padding:.25rem}.p-10{padding:2.5rem}.p-2{padding:.5rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.p-8{padding:2rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-12{padding-top:3rem;padding-bottom:3rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-8{padding-top:2rem;padding-bottom:2rem}.pb-2{padding-bottom:.5rem}.pb-3{padding-bottom:.75rem}.pl-5{padding-left:1.25rem}.pt-4{padding-top:1rem}.pt-6{padding-top:1.5rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-4xl{font-size:2.25rem;line-height:2.5rem}.text-\\[10px\\]{font-size:10px}.text-\\[12px\\]{font-size:12px}.text-base{font-size:1rem;line-height:1.5rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.leading-none{line-height:1}.leading-relaxed{line-height:1.625}.text-blue-600{--tw-text-opacity:1;color:rgb(37 99 235 / var(--tw-text-opacity,1))}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175 / var(--tw-text-opacity,1))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128 / var(--tw-text-opacity,1))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99 / var(--tw-text-opacity,1))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81 / var(--tw-text-opacity,1))}.text-gray-800{--tw-text-opacity:1;color:rgb(31 41 55 / var(--tw-text-opacity,1))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39 / var(--tw-text-opacity,1))}.text-green-600{--tw-text-opacity:1;color:rgb(22 163 74 / var(--tw-text-opacity,1))}.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38 / var(--tw-text-opacity,1))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255 / var(--tw-text-opacity,1))}.line-through{text-decoration-line:line-through}.accent-blue-600{accent-color:#2563eb}.accent-green-600{accent-color:#16a34a}.shadow{--tw-shadow:0 1px 3px 0 rgb(0 0 0 / .1),0 1px 2px -1px rgb(0 0 0 / .1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgb(0 0 0 / .1),0 4px 6px -4px rgb(0 0 0 / .1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px rgb(0 0 0 / .1),0 2px 4px -2px rgb(0 0 0 / .1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgb(0 0 0 / .05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.outline-none{outline:2px solid transparent;outline-offset:2px}.outline{outline-style:solid}.ring-2{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.ring-blue-200{--tw-ring-opacity:1;--tw-ring-color:rgb(191 219 254 / var(--tw-ring-opacity,1))}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}:root{color-scheme:light}.hover\\:border-blue-400:hover{--tw-border-opacity:1;border-color:rgb(96 165 250 / var(--tw-border-opacity,1))}.hover\\:bg-blue-100:hover{--tw-bg-opacity:1;background-color:rgb(219 234 254 / var(--tw-bg-opacity,1))}.hover\\:bg-blue-50:hover{--tw-bg-opacity:1;background-color:rgb(239 246 255 / var(--tw-bg-opacity,1))}.hover\\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216 / var(--tw-bg-opacity,1))}.hover\\:bg-gray-50:hover{--tw-bg-opacity:1;background-color:rgb(249 250 251 / var(--tw-bg-opacity,1))}.hover\\:bg-green-50:hover{--tw-bg-opacity:1;background-color:rgb(240 253 244 / var(--tw-bg-opacity,1))}.hover\\:bg-white\\/60:hover{background-color:#fff9}.hover\\:text-blue-600:hover{--tw-text-opacity:1;color:rgb(37 99 235 / var(--tw-text-opacity,1))}.hover\\:text-gray-700:hover{--tw-text-opacity:1;color:rgb(55 65 81 / var(--tw-text-opacity,1))}@media(min-width:640px){.sm\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1024px){.lg\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.lg\\:grid-cols-\\[300px_1fr\\]{grid-template-columns:300px 1fr}}`;
            shadow.appendChild(style);

            var appRoot = document.createElement('div');
            appRoot.style.cssText = 'background:#fff;min-height:400px;';
            shadow.appendChild(appRoot);

            ReactDOM.createRoot(appRoot).render(e(ProductApp));
            console.log('Gstore EPP: Full app rendered with complete design! ✅');
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
