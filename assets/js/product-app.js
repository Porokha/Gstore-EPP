(function(){
    function money(n){ var x = Number(n||0); return isFinite(x) ? x.toFixed(2) : "0.00"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
        var BOOT = window.GSTORE_BOOT || {};
        if (!BOOT.productId) { console.warn('GSTORE_BOOT missing'); return; }

        var React = window.React, ReactDOM = window.ReactDOM;
        if (!React || !ReactDOM){ console.error('React not loaded'); return; }

        var e = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useMemo = React.useMemo;

        var USED_TIERS = ['80-85','85-90','90-95','95-100'];

        function Button(props){
            var base = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition";
            var variant = props.variant==="outline" ? " border border-gray-300 text-gray-800 bg-white hover:bg-gray-50" : " bg-blue-600 text-white hover:bg-blue-700";
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
                storage: BOOT.storage || ''
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
            var addons = _s7[0]; var setAddons = _s7[1];

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
                    // Set default tier if specified
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

            // Current condition
            var _s8 = useState((cur.condition==='new')?'new':'used');
            var cond = _s8[0]; var setCond = _s8[1];

            // Conditions availability
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

            // Storages for current condition
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

            // Colors for current condition + selected storage
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
                    storage: p.storage||''
                });
                setCond(((p.condition||'').toLowerCase()==='new') ? 'new':'used');
                setNewBat(false);
                setTier(null);
                try { window.history.replaceState({}, "", p.permalink); } catch(e){}
            }

            function switchStorage(st){
                // Find first product matching condition + storage
                var p = siblings.find(function(x){
                    var pc = String(x.condition||'').toLowerCase();
                    var condMatch = (cond==='new' && pc==='new') ||
                        (cond==='used' && pc==='used') ||
                        (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox');
                    return condMatch && String(x.storage).toLowerCase()===String(st).toLowerCase();
                });
                if (p) switchToProductId(p.id);
            }

            // Price calculation
            var priceBlock = useMemo(function(){
                var reg = parseFloat(cur.regular||cur.price||0);
                var sale = parseFloat(cur.sale||0);
                var showSale = (sale>0 && sale<reg) ? sale : null;

                // NEW or no rules → use WooCommerce price
                if (!rules || !rules.exists || cond==='new'){
                    var base = showSale!=null ? sale : reg;
                    return {base:base||0, reg:reg||0, sale:showSale};
                }

                // USED + rules exist
                var pr = rules.pricing||{};
                if (!tier){
                    // No tier selected → show WooCommerce price
                    var base2 = showSale!=null ? sale : reg;
                    return {base:base2||0, reg:reg||0, sale:showSale};
                }

                var chosen = pr[tier] || {};
                if (!chosen.regular && !chosen.sale){
                    // Tier empty → fallback
                    var base3 = showSale!=null ? sale : reg;
                    return {base:base3||0, reg:reg||0, sale:showSale};
                }

                var r = parseFloat(chosen.regular||0);
                var s = parseFloat(chosen.sale||0);
                var base4 = (s>0 && s<r) ? s : r;

                // Add new battery if phone
                if (cur.deviceType==='phone' && newBat){
                    var nb = pr['new_battery']||{};
                    var add = parseFloat((nb.sale && nb.sale!=='') ? nb.sale : (nb.regular||0));
                    if (isFinite(add)) base4 += add;
                }

                return {base:base4||0, reg:r||0, sale:(s>0 && s<r)?s:null};
            }, [cur, rules, tier, newBat, cond]);

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
                cls += active ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50";
                if (!enabled) cls += " opacity-50 cursor-not-allowed";
                return e("button",{
                    className:cls,
                    disabled:!enabled,
                    onClick:function(){ if(enabled) setCond(key); }
                }, lbl);
            }

            // Main render
            return e("div",{className:"max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8"},[
                // LEFT
                e("div",{className:"space-y-6", key:"L"},[
                    e("img",{
                        key:"hero",
                        src:cur.image || BOOT.image || "https://via.placeholder.com/1200x900?text=Product",
                        alt:cur.title||"Product",
                        className:"w-full rounded-2xl shadow-md object-cover"
                    }),

                    // Colors
                    e("div",{className:""},[
                        e("h3",{className:"text-sm font-semibold mb-2"},"Colors"),
                        (colors.length ?
                            e("div",{className:"flex items-center gap-3 flex-wrap"},
                                colors.map(function(c){
                                    var active = (String(c.id)===String(cur.productId));
                                    var cls = "h-14 w-14 rounded-lg cursor-pointer border-2 object-cover "+(active?"border-blue-600":"border-gray-200");
                                    return e("img",{
                                        key:c.id,
                                        src:c.image,
                                        alt:c.color||'color',
                                        className:cls,
                                        onClick:function(){ switchToProductId(c.id); }
                                    });
                                })
                            )
                            : e("div",{className:"text-xs text-gray-500"},"No colors available for this condition"))
                    ])
                ]),

                // RIGHT
                e("div",{className:"space-y-5", key:"R"},[
                    e("h1",{className:"text-2xl font-semibold"}, cur.title || BOOT.title || "Product"),
                    e("hr",{className:"my-4 border-gray-200"}),

                    // Price
                    e("div",{className:"flex items-start gap-4 flex-wrap"},[
                        e("div",{className:"flex flex-col leading-none"},[
                            (priceBlock.reg>0 && e("span",{className:"text-[12px] text-gray-400 line-through"}, gel(priceBlock.reg))),
                            e("span",{className:"text-3xl font-bold text-red-600"},
                                gel(priceBlock.sale!=null ? priceBlock.sale : priceBlock.base))
                        ])
                    ]),

                    // Info badges
                    e("div",{className:"grid grid-cols-2 gap-4 text-sm text-gray-700 mt-2"},[
                        e("div",{className:"flex items-center gap-2"},["🚚 Shipping: 2–3 business days"]),
                        e("div",{className:"flex items-center gap-2"},["🛡️ Warranty: Available"]),
                        e("div",{className:"flex items-center gap-2"},["ℹ️ Condition: ", (cond==='new'?'NEW':'USED')])
                    ]),

                    // Condition tabs
                    e("div",{className:"mt-4"},[
                        e("h3",{className:"text-sm font-semibold mb-2"},"Condition"),
                        e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden mb-3"},[
                            CondButton("NEW",'new', avail.hasNew),
                            CondButton("USED (A)",'used', avail.hasUsed),
                            (cur.deviceType==='laptop' && CondButton("OPEN BOX",'openbox', avail.hasOpen))
                        ]),

                        // Storage selector
                        (storages.length>0 && e("div",{className:"mb-3"},[
                            e("h4",{className:"text-sm font-semibold mb-2"},"Storage"),
                            e("div",{className:"flex gap-2 flex-wrap"},
                                storages.map(function(st){
                                    var active = String(st).toLowerCase()===String(cur.storage).toLowerCase();
                                    var cls = "px-3 py-2 border rounded text-sm font-medium transition "+(active?"bg-blue-600 text-white":"bg-white text-gray-700 hover:bg-gray-50");
                                    return e("button",{key:st,className:cls,onClick:function(){ switchStorage(st); }}, st);
                                })
                            )
                        ])),

                        // Battery tiers (used + phone + rules exist)
                        (cond==='used' && cur.deviceType==='phone' && rules && rules.exists &&
                            e("div",null,[
                                e("h4",{className:"text-sm font-semibold mb-2"},"Battery Health"),
                                e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden"},
                                    USED_TIERS.map(function(t){
                                        var pr = rules.pricing || {};
                                        var row = pr[t] || {};
                                        var enabled = !!((row.regular && row.regular!=='') || (row.sale && row.sale!==''));
                                        var active = (tier===t);
                                        var cls = "flex-1 text-center py-2 text-xs font-medium transition ";
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

                                // New battery checkbox
                                (function(){
                                    var nb = (rules.pricing||{})['new_battery']||{};
                                    var hasPrice = (nb.regular && nb.regular!=='') || (nb.sale && nb.sale!=='');
                                    if (!hasPrice) return null;
                                    return e("div",{className:"mt-3 flex items-center justify-between bg-gray-50 border rounded-lg p-3"},[
                                        e("label",{className:"flex items-center gap-2 text-sm font-medium text-gray-700"},[
                                            e("input",{
                                                type:"checkbox",
                                                checked:newBat,
                                                onChange:function(ev){ setNewBat(ev.target.checked); },
                                                className:"h-4 w-4"
                                            }),
                                            "Add New Battery"
                                        ])
                                    ]);
                                })()
                            ])
                        )
                    ]),

                    // CTA buttons
                    e("div",{className:"flex gap-3 mt-6"},[
                        e(Button,{
                            className:"flex-1",
                            onClick:function(){ addToCart('/cart/'); }
                        },"🛒 Add to Cart "+gel(priceBlock.base||0)),
                        e(Button,{
                            variant:"outline",
                            className:"flex-1",
                            onClick:function(){ addToCart('/checkout/'); }
                        },"Buy Now "+gel(priceBlock.base||0))
                    ]),

                    // FBT section
                    (fbt.length>0 && e("div",{className:"mt-8 pt-6 border-t"},[
                        e("h3",{className:"text-lg font-semibold mb-4"},"Frequently Bought Together"),
                        e("div",{className:"grid grid-cols-3 gap-4"},
                            fbt.map(function(item){
                                return e("div",{key:item.id,className:"border rounded-lg p-3"},[
                                    e("img",{src:item.image,alt:item.title,className:"w-full h-32 object-cover rounded mb-2"}),
                                    e("h4",{className:"text-xs font-medium truncate"},item.title),
                                    e("p",{className:"text-sm font-bold text-red-600"},gel(item.price))
                                ]);
                            })
                        )
                    ]))
                ])
            ]);
        }

        // Mount
        var host = document.getElementById('gstore-epp-shadow-host');
        if (!host){ console.error('Host #gstore-epp-shadow-host not found'); return; }

        var shadow = host.shadowRoot || host.attachShadow({mode:'open'});

        // Inject CSS
        var tw = document.createElement('link');
        tw.rel='stylesheet';
        tw.href = BOOT.assetsCss || (window.GSTORE_EPP_URL || '') + 'assets/css/tw.css';
        shadow.appendChild(tw);

        var app = document.createElement('link');
        app.rel='stylesheet';
        app.href = (window.GSTORE_EPP_URL || '') + 'assets/css/app.css';
        shadow.appendChild(app);

        // App root
        var appRoot = document.createElement('div');
        appRoot.className = 'gstore-app';
        shadow.appendChild(appRoot);

        ReactDOM.createRoot(appRoot).render(e(ProductApp));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();