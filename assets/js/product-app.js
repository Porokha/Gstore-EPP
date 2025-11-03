(function(){
    function money(n){ var x = Number(n||0); return isFinite(x) ? x.toFixed(2) : "0.00"; }
    function gel(n){ return "₾" + money(n); }
    function clone(x){ try{ return JSON.parse(JSON.stringify(x)); } catch(e){ return x; } }

    function mount(){
        var BOOT = window.GSTORE_BOOT || {};
        if (!BOOT.productId) { console.warn('GSTORE_BOOT missing'); return; }

        var React = window.React, ReactDOM = window.ReactDOM;
        var e = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo;

        var USED_TIERS = ['80-85','85-90','90-95','95-100'];

        function Button(props){
            var base = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition";
            var variant = props.variant==="outline" ? " border border-gray-300 text-gray-800 bg-white hover:bg-gray-50" : " bg-blue-600 text-white hover:bg-blue-700";
            var cn = (props.className||"");
            var p = Object.assign({}, props); delete p.className; delete p.variant;
            return e("button", Object.assign({}, p, { className: (base+variant+" "+cn).trim() }), props.children);
        }

        function fetchJSON(url, opt){
            return fetch(url, opt).then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); });
        }
        function postForm(url, data){
            var fd = new FormData(); Object.keys(data||{}).forEach(function(k){fd.append(k, data[k]);});
            return fetch(url, { method:'POST', body:fd, credentials:'same-origin' })
                .then(function(r){ return r.json(); });
        }

        function ProductApp(){
            var [siblings, setSiblings] = useState([]);    // all color/condition/storage siblings (brand+model)
            var [cur, setCur]         = useState({
                productId: BOOT.productId, title: BOOT.title, permalink: BOOT.permalink,
                price: BOOT.price, regular: BOOT.regular, sale: BOOT.sale, color: BOOT.color,
                condition: (BOOT.condition||'').toLowerCase(), deviceType: BOOT.deviceType || 'phone'
            });
            var [rules, setRules]     = useState(null);
            var [tier, setTier]       = useState(null); // used only if rules exist; null = no selection
            var [newBat, setNewBat]   = useState(false);

            // Load siblings (brand+model)
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/siblings?product_id=' + encodeURIComponent(BOOT.productId);
                fetchJSON(url).then(function(j){
                    if (j && j.ok){ setSiblings(j.siblings||[]); } else { setSiblings([]); }
                }).catch(function(){ setSiblings([]); });
            }, []);

            // Load pricing rules for group_key
            useEffect(function(){
                var url = BOOT.rest.base.replace(/\/+$/,'') + '/pricing?product_id=' + encodeURIComponent(BOOT.productId);
                fetchJSON(url).then(function(j){ setRules(j); }).catch(function(){ setRules(null); });
            }, []);

            // Conditions availability
            var avail = useMemo(function(){
                var hasNew=false, hasUsed=false, hasOpen=false;
                (siblings||[]).forEach(function(p){
                    var c = String(p.condition||'').toLowerCase();
                    if (c==='new') hasNew=true;
                    else if (c==='used') hasUsed=true;
                    else if (c.replace(/\s+/g,'')==='openbox') hasOpen=true;
                });
                return {hasNew:hasNew, hasUsed:hasUsed, hasOpen:hasOpen};
            }, [siblings]);

            // Current condition we show
            var [cond, setCond] = useState( (cur.condition==='new')?'new':'used' );

            // Color list for current condition (mini images)
            var colors = useMemo(function(){
                var seen = {};
                var list = [];
                (siblings||[]).forEach(function(p){
                    var pc = String(p.condition||'').toLowerCase();
                    if ((cond==='new' && pc==='new') || (cond==='used' && pc==='used') || (cond==='openbox' && pc.replace(/\s+/g,'')==='openbox')){
                        var key = (String(p.color||'').toLowerCase().replace(/\s+/g,'')) || ('id-'+p.id);
                        if (!seen[key]){ seen[key]=true; list.push({ id:p.id, color:(p.color||''), image:p.image }); }
                    }
                });
                return list;
            }, [siblings, cond]);

            function switchToProductId(id){
                var p = (siblings||[]).find(function(x){ return Number(x.id)===Number(id); });
                if (!p) return;
                setCur({
                    productId: p.id, title: p.title, permalink: p.permalink,
                    price: p.price, regular: p.regular, sale: p.sale,
                    color: p.color, condition: (p.condition||'').toLowerCase(), deviceType: cur.deviceType
                });
                setCond( ((p.condition||'').toLowerCase()==='new') ? 'new':'used' );
                setNewBat(false);
                try { window.history.replaceState({}, "", p.permalink); } catch(e){}
            }

            // Price compute
            var priceBlock = useMemo(function(){
                var reg = parseFloat(cur.regular||cur.price||0);
                var sale = parseFloat(cur.sale||0);
                var base;
                var showSale = (sale>0 && sale<reg) ? sale : null;

                // If no rules or condition new -> use Woo price
                if (!rules || !rules.exists || cond==='new'){
                    base = showSale!=null ? sale : reg;
                    return {base:base||0, reg:reg||0, sale:showSale};
                }

                // used + rules
                var pr = rules.pricing||{};
                var chosen = (tier && pr[tier]) ? pr[tier] : null;
                if (!chosen || ((!chosen.regular || chosen.regular==='') && (!chosen.sale || chosen.sale===''))){
                    // no price for selected tier -> disable selection, fallback to Woo price
                    base = showSale!=null ? sale : reg;
                    return {base:base||0, reg:reg||0, sale:showSale};
                }
                var r = parseFloat(chosen.regular||0);
                var s = parseFloat(chosen.sale||0);
                base = (s>0 && s<r) ? s : r;

                if (cur.deviceType==='phone' && newBat){
                    var nb = pr['new_battery']||{};
                    var add = parseFloat( (nb.sale && nb.sale!=='') ? nb.sale : (nb.regular||0) );
                    if (isFinite(add)) base += add;
                }
                return {base:base||0, reg:r||0, sale:(s>0 && s<r)?s:null};
            }, [cur, rules, tier, newBat, cond]);

            // UI helpers
            function addToCart(nextUrl){
                postForm(BOOT.ajax.url, { action:'gstore_epp_add_to_cart', nonce:BOOT.ajax.nonce, product_id:cur.productId, quantity:1 })
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
                return e("button",{className:cls, disabled:!enabled, onClick:function(){ if(enabled) setCond(key); }}, lbl);
            }

            return e("div",{className:"max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-8"},[
                // LEFT (Hero + swatches)
                e("div",{className:"space-y-6", key:"L"},[
                    e("img",{key:"hero", src:(function(){
                            var p = (siblings||[]).find(function(x){ return Number(x.id)===Number(cur.productId); });
                            return (p && p.image) ? p.image : "https://via.placeholder.com/1200x900?text=Product";
                        })(), alt:cur.title||"Product", className:"w-full rounded-2xl shadow-md object-cover"}),

                    e("div",{className:""},[
                        e("h3",{className:"text-sm font-semibold mb-2"},"Colors"),
                        (colors.length? e("div",{className:"flex items-center gap-3 flex-wrap"},
                            colors.map(function(c){
                                var active = (String(c.id)===String(cur.productId));
                                var cls = "h-14 w-14 rounded-lg cursor-pointer border-2 "+(active?"border-blue-600":"border-gray-200");
                                return e("img",{key:c.id,src:c.image,alt:c.color||'color',className:cls,onClick:function(){ switchToProductId(c.id); }});
                            })
                        ) : e("div",{className:"text-xs text-gray-500"},"No colors available"))
                    ])
                ]),

                // RIGHT (Info)
                e("div",{className:"space-y-5", key:"R"},[
                    e("h1",{className:"text-2xl font-semibold"}, cur.title || BOOT.title || "Product"),
                    e("hr",{className:"my-4 border-gray-200"}),

                    // Price
                    e("div",{className:"flex items-start gap-4 flex-wrap"},[
                        e("div",{className:"flex flex-col leading-none"},[
                            e("span",{className:"text-[12px] text-gray-400 line-through"}, gel(priceBlock.reg || priceBlock.base)),
                            e("span",{className:"text-3xl font-bold text-red-600"}, gel( (priceBlock.sale!=null?priceBlock.sale:priceBlock.base) || 0 ))
                        ])
                    ]),

                    // Info badges
                    e("div",{className:"grid grid-cols-2 gap-4 text-sm text-gray-700 mt-2"},[
                        e("div",{className:"flex items-center gap-2"},["🚚"," Shipping: 2–3 business days"]),
                        e("div",{className:"flex items-center gap-2"},["🛡️"," Warranty: Available"]),
                        e("div",{className:"flex items-center gap-2"},["ℹ️"," Condition: ", (cond==='new'?'NEW':'USED')])
                    ]),

                    // Condition group
                    e("div",{className:"mt-4"},[
                        e("h3",{className:"text-sm font-semibold mb-2"},"Condition"),
                        e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden mb-3"},[
                            CondButton("NEW",'new', !!avail.hasNew),
                            CondButton("USED (A)",'used', !!avail.hasUsed),
                            (cur.deviceType==='laptop' ? CondButton("OPEN BOX",'openbox', !!avail.hasOpen) : null)
                        ]),

                        // Used tiers
                        (cond==='used' && rules && rules.exists) && e(React.Fragment,null,[
                            e("div",{className:"flex border border-gray-200 rounded-lg overflow-hidden"}, USED_TIERS.map(function(t){
                                var pr = rules.pricing || {};
                                var row = pr[t] || {};
                                var enabled = !!( (row.regular && row.regular!=='') || (row.sale && row.sale!=='') );
                                var active = (tier===t);
                                var cls = "flex-1 text-center py-2 text-sm font-medium transition-all "+
                                    (active ? "bg-green-600 text-white" : (enabled?"bg-white text-gray-700 hover:bg-green-50":"bg-gray-100 text-gray-400 cursor-not-allowed"));
                                return e("button",{key:t,className:cls,disabled:!enabled,onClick:function(){ if(enabled) setTier(t); }}, t+"%");
                            })),

                            // Phone-only new battery toggle
                            (cur.deviceType==='phone') && e("div",{className:"mt-3 flex items-center justify-between bg-gray-50 border rounded-lg p-3"},[
                                e("label",{className:"flex items-center gap-2 text-sm font-medium text-gray-700"},[
                                    e("input",{type:"checkbox",checked:newBat,onChange:function(ev){ setNewBat(ev.target.checked); },className:"h-4 w-4"}),
                                    "Add New Battery"
                                ])
                            ])
                        ])
                    ]),

                    // CTAs
                    e("div",{className:"flex gap-3 mt-6"},[
                        e(Button,{className:"flex-1",onClick:function(){ addToCart('/cart/'); }},"🛒 Add to Cart "+gel(priceBlock.base||0)),
                        e(Button,{variant:"outline",className:"flex-1",onClick:function(){ addToCart('/checkout/'); }},"Buy Now "+gel(priceBlock.base||0))
                    ])
                ])
            ]);
        }

        // Mount into Shadow DOM host
        var host = document.getElementById('gstore-epp-shadow-host');
        if (!host){ console.error('Host not found'); return; }
        var shadow = host.attachShadow ? host.attachShadow({mode:'open'}) : host;

        // Tailwind CSS injection (local + CDN fallback)
        var link1 = document.createElement('link');
        link1.rel='stylesheet'; link1.href = (BOOT.assetsCss || '') || (window.GSTORE_EPP_URL_CSS || '') || '';
        // Instead, inject our plugin css directly:
        var tw = document.createElement('link'); tw.rel='stylesheet'; tw.href = (window.GSTORE_EPP_TW || '') || "<?php echo esc_js(GSTORE_EPP_URL.'assets/css/tw.css'); ?>";
        var app= document.createElement('link'); app.rel='stylesheet'; app.href = "<?php echo esc_js(GSTORE_EPP_URL.'assets/css/app.css'); ?>";
        shadow.appendChild(tw); shadow.appendChild(app);

        var appRoot = document.createElement('div'); shadow.appendChild(appRoot);
        ReactDOM.createRoot(appRoot).render(e(ProductApp));
    }

    if (window.React && window.ReactDOM) { mount(); }
    else {
        console.error('React not found — ensure react scripts enqueued before product-app.js');
    }
})();
