/**
 * Gstore EPP - React Product App - FIXED VERSION v4.2.0
 *
 * FIXES IMPLEMENTED:
 * 1. Battery Health text now updates based on selected tier
 * 2. Laptop products show proper add-on UI (RAM/Storage), not phone UI
 * 3. Unavailable options are hidden instead of grayed out
 * 4. Mobile layout alignment fixed (proper centering)
 * 5. Price calculation includes all selections for cart
 * 6. Add to cart sends all necessary data to backend
 */

(function() {
    'use strict';

    const {createElement: e, useState, useEffect, useMemo, useCallback} = React;

    console.log('Gstore EPP v4.2.0 - All Critical Issues Fixed');

    // ============================================
    // HELPER: Translation function
    // ============================================
    function t(key, fallback, replacements) {
        var translations = window.GSTORE_EPP_BOOT?.translations || {};
        var text = translations[key] || fallback;

        if (replacements) {
            Object.keys(replacements).forEach(function(placeholder) {
                text = text.replace(new RegExp('{' + placeholder + '}', 'g'), replacements[placeholder]);
            });
        }

        return text;
    }

    // ============================================
    // HELPER: Format price
    // ============================================
    function formatPrice(amount) {
        return '₾' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // ============================================
    // HELPER: Calculate battery health from tier
    // FIX #1: Battery health now dynamic
    // ============================================
    function calculateBatteryHealth(tier) {
        if (!tier) return '100';

        // Parse tier like "90-95" and return midpoint
        const parts = tier.split('-');
        if (parts.length === 2) {
            const min = parseInt(parts[0]);
            const max = parseInt(parts[1]);
            return Math.round((min + max) / 2).toString();
        }

        // Fallback
        return tier.replace(/[^0-9]/g, '') || '100';
    }

    // ============================================
    // MAIN PRODUCT APP COMPONENT
    // ============================================
    function ProductApp() {
        const BOOT = window.GSTORE_EPP_BOOT || {};
        const productId = BOOT.product_id;

        // ============================================
        // STATE MANAGEMENT
        // ============================================
        const [siblings, setSiblings] = useState([]);
        const [cur, setCur] = useState({});
        const [rules, setRules] = useState(null);
        const [tier, setTier] = useState(null);
        const [newBat, setNewBat] = useState(false);
        const [cond, setCond] = useState('new');
        const [fbt, setFbt] = useState([]);
        const [selectedFBT, setSelectedFBT] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        // Laptop add-ons state - FIX #2
        const [laptopRAM, setLaptopRAM] = useState([]);
        const [laptopStorage, setLaptopStorage] = useState([]);
        const [selectedRAM, setSelectedRAM] = useState([]);
        const [selectedStorage, setSelectedStorage] = useState([]);

        // Mobile state
        const [activeTab, setActiveTab] = useState('specs');

        // ============================================
        // LOAD SIBLINGS DATA
        // ============================================
        useEffect(() => {
            if (!productId) {
                setError('No product ID provided');
                setLoading(false);
                return;
            }

            fetch('/wp-json/gstore/v1/siblings?product_id=' + productId)
                .then(res => res.json())
                .then(data => {
                    if (data.ok && data.siblings) {
                        setSiblings(data.siblings);

                        // Find current product
                        const current = data.siblings.find(s => s.id === productId);
                        if (current) {
                            setCur(current);
                            setCond(current.condition || 'new');
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to load siblings:', err);
                    setError('Failed to load product variants');
                })
                .finally(() => setLoading(false));
        }, [productId]);

        // ============================================
        // LOAD PRICING RULES
        // ============================================
        useEffect(() => {
            if (!productId) return;

            fetch('/wp-json/gstore/v1/pricing?product_id=' + productId)
                .then(res => res.json())
                .then(data => {
                    if (data.ok) {
                        setRules(data);

                        // Auto-set default tier for USED products
                        if (data.default_condition && cond === 'used') {
                            setTier(data.default_condition);
                        }
                    }
                })
                .catch(err => console.error('Failed to load pricing rules:', err));
        }, [productId, cond]);

        // ============================================
        // LOAD LAPTOP ADD-ONS - FIX #2
        // ============================================
        useEffect(() => {
            if (cur.deviceType !== 'laptop') return;

            // Fetch laptop add-ons from backend
            fetch('/wp-json/gstore/v1/laptop-addons')
                .then(res => res.json())
                .then(data => {
                    if (data.ok) {
                        setLaptopRAM(data.ram || []);
                        setLaptopStorage(data.storage || []);
                    }
                })
                .catch(err => console.error('Failed to load laptop add-ons:', err));
        }, [cur.deviceType]);

        // ============================================
        // LOAD FBT PRODUCTS
        // ============================================
        useEffect(() => {
            if (!productId) return;

            fetch('/wp-json/gstore/v1/fbt?product_id=' + productId)
                .then(res => res.json())
                .then(data => {
                    if (data.ok && data.products) {
                        setFbt(data.products);
                    }
                })
                .catch(err => console.error('Failed to load FBT:', err));
        }, [productId]);

        // ============================================
        // AUTO-APPLY DEFAULT TIER WHEN SWITCHING TO USED
        // ============================================
        useEffect(() => {
            if (cond === 'used' && rules?.default_condition && !tier) {
                setTier(rules.default_condition);
            }
            if (cond === 'new') {
                setTier(null);
                setNewBat(false);
            }
        }, [cond, rules]);

        // ============================================
        // PRICE CALCULATION - FIX #5
        // ============================================
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

                // Add new battery if checked (phones only)
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

        // Calculate laptop add-on prices
        const laptopAddOnPrice = useMemo(() => {
            let total = 0;

            selectedRAM.forEach(key => {
                const addon = laptopRAM.find(a => a.key === key);
                if (addon) total += parseFloat(addon.price || 0);
            });

            selectedStorage.forEach(key => {
                const addon = laptopStorage.find(a => a.key === key);
                if (addon) total += parseFloat(addon.price || 0);
            });

            return total;
        }, [selectedRAM, selectedStorage, laptopRAM, laptopStorage]);

        // Calculate FBT price
        const fbtPrice = useMemo(() => {
            return selectedFBT.reduce((sum, id) => {
                const item = fbt.find(f => f.id === id);
                return sum + parseFloat(item?.price || 0);
            }, 0);
        }, [selectedFBT, fbt]);

        // Grand total with all add-ons
        const grandTotal = priceBlock.base + laptopAddOnPrice + fbtPrice;

        // ============================================
        // BATTERY HEALTH DISPLAY - FIX #1
        // ============================================
        const batteryHealth = useMemo(() => {
            if (cond === 'new' || cur.deviceType !== 'phone') return '100';
            if (!tier) return '100';
            return calculateBatteryHealth(tier);
        }, [cond, tier, cur.deviceType]);

        // ============================================
        // SIBLING FILTERING - FIX #3 (Hide unavailable)
        // ============================================
        const availableStorages = useMemo(() => {
            const storages = {};
            siblings.forEach(s => {
                if (s.storage &&
                    s.color === cur.color &&
                    s.condition === cur.condition) {
                    storages[s.storage] = s;
                }
            });
            return storages;
        }, [siblings, cur.color, cur.condition]);

        const availableColors = useMemo(() => {
            const colors = {};
            siblings.forEach(s => {
                if (s.color &&
                    s.storage === cur.storage &&
                    s.condition === cur.condition) {
                    colors[s.color] = s;
                }
            });
            return colors;
        }, [siblings, cur.storage, cur.condition]);

        const availableConditions = useMemo(() => {
            const conditions = {};
            siblings.forEach(s => {
                if (s.condition &&
                    s.storage === cur.storage &&
                    s.color === cur.color) {
                    conditions[s.condition] = s;
                }
            });
            return conditions;
        }, [siblings, cur.storage, cur.color]);

        const availableTiers = useMemo(() => {
            if (!rules || !rules.pricing) return [];
            return Object.keys(rules.pricing).filter(k => k !== 'new_battery');
        }, [rules]);

        // ============================================
        // SWITCH HANDLERS
        // ============================================
        const switchStorage = useCallback((storage) => {
            const sibling = availableStorages[storage];
            if (sibling) {
                window.location.href = sibling.permalink;
            }
        }, [availableStorages]);

        const switchColor = useCallback((color) => {
            const sibling = availableColors[color];
            if (sibling) {
                window.location.href = sibling.permalink;
            }
        }, [availableColors]);

        const switchCondition = useCallback((condition) => {
            const sibling = availableConditions[condition];
            if (sibling) {
                window.location.href = sibling.permalink;
            } else {
                // If no sibling, just toggle state (for UI)
                setCond(condition);
            }
        }, [availableConditions]);

        // ============================================
        // ADD TO CART HANDLER - FIX #6
        // ============================================
        const handleAddToCart = useCallback(() => {
            const data = new FormData();
            data.append('action', 'gstore_epp_add_to_cart');
            data.append('nonce', BOOT.nonce);
            data.append('product_id', productId);
            data.append('quantity', 1);
            data.append('condition', cond);

            // Phone-specific data
            if (cur.deviceType === 'phone') {
                if (tier) data.append('tier', tier);
                if (newBat) data.append('new_battery', '1');
            }

            // Laptop-specific data
            if (cur.deviceType === 'laptop') {
                if (selectedRAM.length > 0) {
                    data.append('laptop_ram', JSON.stringify(selectedRAM));
                }
                if (selectedStorage.length > 0) {
                    data.append('laptop_storage', JSON.stringify(selectedStorage));
                }
            }

            // FBT products
            if (selectedFBT.length > 0) {
                data.append('fbt_ids', JSON.stringify(selectedFBT));
            }

            // Send to backend
            fetch(BOOT.ajax_url, {
                method: 'POST',
                body: data
            })
                .then(res => res.json())
                .then(response => {
                    if (response.success) {
                        // Redirect to cart or show success message
                        window.location.href = response.data.cart_url || '/cart';
                    } else {
                        alert('Failed to add to cart: ' + (response.data?.message || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error('Add to cart error:', err);
                    alert('Failed to add to cart. Please try again.');
                });
        }, [productId, cond, tier, newBat, selectedFBT, selectedRAM, selectedStorage, cur.deviceType]);

        // ============================================
        // RENDER - LOADING/ERROR STATES
        // ============================================
        if (loading) {
            return e('div', {className: 'flex items-center justify-center min-h-screen'},
                e('div', {className: 'text-lg'}, 'Loading...')
            );
        }

        if (error) {
            return e('div', {className: 'flex items-center justify-center min-h-screen'},
                e('div', {className: 'text-lg text-red-600'}, error)
            );
        }

        // ============================================
        // RENDER - MAIN LAYOUT
        // FIX #4: Mobile alignment fixed
        // ============================================
        return e('div', {className: 'min-h-screen bg-white'}, [
            e('div', {
                key: 'main',
                // MOBILE FIX: proper centering and padding
                className: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8'
            }, [
                // ============================================
                // LEFT COLUMN (Desktop) / TOP (Mobile)
                // ============================================
                e('div', {key: 'left', className: 'space-y-6'}, [
                    // Hero Image
                    cur.image && e('div', {key: 'hero', className: 'aspect-square bg-gray-100 rounded-lg overflow-hidden'},
                        e('img', {
                            src: cur.image,
                            alt: cur.title,
                            className: 'w-full h-full object-cover'
                        })
                    ),

                    // Color Swatches - FIX #3: Only show available colors
                    Object.keys(availableColors).length > 1 && e('div', {key: 'colors', className: 'flex gap-3 justify-center lg:justify-start'},
                        Object.keys(availableColors).map(color => {
                            const active = color === cur.color;
                            return e('button', {
                                key: color,
                                onClick: () => switchColor(color),
                                className: `w-12 h-12 rounded-full border-2 ${active ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'} transition-all`,
                                title: color,
                                style: {
                                    backgroundColor: color.toLowerCase().replace(/\s/g, '')
                                }
                            });
                        })
                    ),

                    // Description
                    e('div', {key: 'desc', className: 'prose max-w-none hidden lg:block'},
                        e('p', {}, cur.title || 'Product description')
                    ),

                    // Tabs (Desktop only)
                    e('div', {key: 'tabs', className: 'hidden lg:block'}, [
                        e('div', {key: 'tab-headers', className: 'flex border-b'}, [
                            e('button', {
                                key: 'specs',
                                onClick: () => setActiveTab('specs'),
                                className: `px-4 py-2 ${activeTab === 'specs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`
                            }, t('specifications_tab', 'Specifications')),
                            e('button', {
                                key: 'warranty',
                                onClick: () => setActiveTab('warranty'),
                                className: `px-4 py-2 ${activeTab === 'warranty' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`
                            }, t('warranty_tab', 'Warranty')),
                            e('button', {
                                key: 'compare',
                                onClick: () => setActiveTab('compare'),
                                className: `px-4 py-2 ${activeTab === 'compare' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`
                            }, t('compare_tab', 'Compare'))
                        ]),
                        e('div', {key: 'tab-content', className: 'p-4 bg-gray-50 rounded-b-lg'},
                            'Tab content here'
                        )
                    ])
                ]),

                // ============================================
                // RIGHT COLUMN (Desktop) / BOTTOM (Mobile)
                // ============================================
                e('div', {key: 'right', className: 'space-y-6'}, [
                    // Title (Mobile only, at top)
                    e('h1', {key: 'title', className: 'text-2xl lg:text-3xl font-bold lg:hidden'}, cur.title),

                    // Title (Desktop)
                    e('h1', {key: 'title-desktop', className: 'text-3xl font-bold hidden lg:block'}, cur.title),

                    // Price
                    e('div', {key: 'price', className: 'space-y-2'}, [
                        e('div', {key: 'main-price', className: 'flex items-baseline gap-3'}, [
                            e('span', {className: `text-3xl font-bold ${priceBlock.hasSale ? 'text-red-600' : 'text-gray-900'}`},
                                formatPrice(priceBlock.base)
                            ),
                            priceBlock.hasSale && e('span', {className: 'text-xl text-gray-500 line-through'},
                                formatPrice(priceBlock.reg)
                            )
                        ]),
                        e('div', {key: 'installment', className: 'text-sm text-gray-600'},
                            t('installment_text', 'From ₾{amount}/month', {
                                amount: Math.round(priceBlock.base / 12)
                            })
                        ),
                        // Show add-on prices if any
                        (laptopAddOnPrice > 0 || fbtPrice > 0) && e('div', {key: 'addons', className: 'text-sm text-gray-600 pt-2 border-t'}, [
                            laptopAddOnPrice > 0 && e('div', {}, `Add-ons: ${formatPrice(laptopAddOnPrice)}`),
                            fbtPrice > 0 && e('div', {}, `Accessories: ${formatPrice(fbtPrice)}`),
                            e('div', {className: 'font-bold text-lg text-gray-900 mt-1'},
                                `Total: ${formatPrice(grandTotal)}`
                            )
                        ])
                    ]),

                    // Info Grid - FIX #1: Battery health now dynamic
                    e('div', {key: 'info-grid', className: 'grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg'}, [
                        e('div', {key: 'shipping', className: 'flex items-center gap-2'}, [
                            e('span', {}, '📦'),
                            e('span', {className: 'text-sm'}, t('shipping_text', 'Shipping: 2–3 days'))
                        ]),
                        e('div', {key: 'warranty', className: 'flex items-center gap-2'}, [
                            e('span', {}, '🛡️'),
                            e('span', {className: 'text-sm'}, t('warranty_text', 'Warranty'))
                        ]),
                        cur.deviceType === 'phone' && e('div', {key: 'battery', className: 'flex items-center gap-2'}, [
                            e('span', {}, '🔋'),
                            e('span', {className: 'text-sm'},
                                t('battery_health_text', 'Battery: {health}%', {health: batteryHealth})
                            )
                        ]),
                        e('div', {key: 'condition', className: 'flex items-center gap-2'}, [
                            e('span', {}, 'ℹ️'),
                            e('span', {className: 'text-sm'},
                                t('condition_text', 'Condition: {condition}', {condition: cond.toUpperCase()})
                            )
                        ])
                    ]),

                    // ============================================
                    // PHONE-SPECIFIC UI
                    // FIX #2: Only show for phones
                    // ============================================
                    cur.deviceType === 'phone' && e('div', {key: 'phone-selectors', className: 'space-y-6'}, [
                        // Storage Options - FIX #3: Only show available
                        Object.keys(availableStorages).length > 1 && e('div', {key: 'storage'}, [
                            e('h3', {className: 'text-lg font-semibold mb-3'},
                                t('storage_options_text', 'Storage Options')
                            ),
                            e('div', {className: 'grid grid-cols-4 gap-2'},
                                Object.keys(availableStorages).map(st => {
                                    const active = st === cur.storage;
                                    return e('button', {
                                        key: st,
                                        onClick: () => switchStorage(st),
                                        className: `px-4 py-3 border rounded-lg text-sm font-medium transition-all ${
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                        }`
                                    }, st);
                                })
                            )
                        ]),

                        // Condition Selector - FIX #3: Only show available
                        Object.keys(availableConditions).length > 1 && e('div', {key: 'condition'}, [
                            e('h3', {className: 'text-lg font-semibold mb-3'},
                                t('condition_label', 'Condition')
                            ),
                            e('div', {className: 'grid grid-cols-2 gap-3'},
                                Object.keys(availableConditions).map(c => {
                                    const active = c === cond;
                                    const label = c === 'new'
                                        ? t('condition_new', 'NEW')
                                        : t('condition_used', 'USED (A)');
                                    return e('button', {
                                        key: c,
                                        onClick: () => switchCondition(c),
                                        className: `px-4 py-3 border rounded-lg font-medium transition-all ${
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                        }`
                                    }, label);
                                })
                            )
                        ]),

                        // Battery Tiers (USED only) - FIX #3: Hide unavailable tiers
                        cond === 'used' && availableTiers.length > 0 && e('div', {key: 'tiers'}, [
                            e('h3', {className: 'text-lg font-semibold mb-3'}, 'Battery Health'),
                            e('div', {className: 'grid grid-cols-2 gap-2'},
                                availableTiers.map(t => {
                                    const active = t === tier;
                                    return e('button', {
                                        key: t,
                                        onClick: () => setTier(t),
                                        className: `px-4 py-3 border rounded-lg text-sm font-medium transition-all ${
                                            active
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                                        }`
                                    }, t + '%');
                                })
                            ),

                            // New Battery Toggle
                            rules?.pricing?.new_battery && e('div', {key: 'new-battery', className: 'mt-3'},
                                e('button', {
                                        onClick: () => setNewBat(!newBat),
                                        className: `w-full px-4 py-3 border rounded-lg font-medium transition-all ${
                                            newBat
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                                        }`
                                    },
                                    newBat
                                        ? t('new_battery_added', '✓ New Battery Added (+₾{amount})', {
                                            amount: rules.pricing.new_battery.sale || rules.pricing.new_battery.regular
                                        })
                                        : t('add_new_battery', '+ Add New Battery (+₾{amount})', {
                                            amount: rules.pricing.new_battery.sale || rules.pricing.new_battery.regular
                                        })
                                )
                            )
                        ])
                    ]),

                    // ============================================
                    // LAPTOP-SPECIFIC UI
                    // FIX #2: Show laptop add-ons instead of phone UI
                    // ============================================
                    cur.deviceType === 'laptop' && e('div', {key: 'laptop-selectors', className: 'space-y-6'}, [
                        // RAM Add-ons
                        laptopRAM.length > 0 && e('div', {key: 'ram'}, [
                            e('h3', {className: 'text-lg font-semibold mb-3'}, 'Add RAM'),
                            e('div', {className: 'space-y-2'},
                                laptopRAM.map(addon => {
                                    const checked = selectedRAM.includes(addon.key);
                                    return e('label', {
                                        key: addon.key,
                                        className: 'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'
                                    }, [
                                        e('input', {
                                            type: 'checkbox',
                                            checked: checked,
                                            onChange: () => {
                                                if (checked) {
                                                    setSelectedRAM(selectedRAM.filter(k => k !== addon.key));
                                                } else {
                                                    setSelectedRAM([...selectedRAM, addon.key]);
                                                }
                                            },
                                            className: 'w-5 h-5'
                                        }),
                                        e('span', {className: 'flex-1'}, addon.label),
                                        e('span', {className: 'font-semibold'}, `+${formatPrice(addon.price)}`)
                                    ]);
                                })
                            )
                        ]),

                        // Storage Add-ons
                        laptopStorage.length > 0 && e('div', {key: 'storage'}, [
                            e('h3', {className: 'text-lg font-semibold mb-3'}, 'Add Storage'),
                            e('div', {className: 'space-y-2'},
                                laptopStorage.map(addon => {
                                    const checked = selectedStorage.includes(addon.key);
                                    return e('label', {
                                        key: addon.key,
                                        className: 'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'
                                    }, [
                                        e('input', {
                                            type: 'checkbox',
                                            checked: checked,
                                            onChange: () => {
                                                if (checked) {
                                                    setSelectedStorage(selectedStorage.filter(k => k !== addon.key));
                                                } else {
                                                    setSelectedStorage([...selectedStorage, addon.key]);
                                                }
                                            },
                                            className: 'w-5 h-5'
                                        }),
                                        e('span', {className: 'flex-1'}, addon.label),
                                        e('span', {className: 'font-semibold'}, `+${formatPrice(addon.price)}`)
                                    ]);
                                })
                            )
                        ])
                    ]),

                    // Add to Cart Buttons
                    e('div', {key: 'cta', className: 'space-y-3'}, [
                        e('button', {
                            key: 'cart',
                            onClick: handleAddToCart,
                            className: 'w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors'
                        }, t('add_to_cart', 'Add to Cart')),
                        e('button', {
                            key: 'buy-now',
                            onClick: handleAddToCart,
                            className: 'w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors'
                        }, t('buy_now', 'Buy Now'))
                    ]),

                    // FBT Section
                    fbt.length > 0 && e('div', {key: 'fbt', className: 'space-y-4 border-t pt-6'}, [
                        e('h3', {key: 'fbt-title', className: 'text-xl font-bold'},
                            t('fbt_title', 'Frequently Bought Together')
                        ),
                        e('div', {key: 'fbt-items', className: 'space-y-3'},
                            fbt.map(item => {
                                const selected = selectedFBT.includes(item.id);
                                return e('div', {
                                    key: item.id,
                                    className: 'flex items-center gap-4 p-4 border rounded-lg'
                                }, [
                                    item.image && e('img', {
                                        key: 'img',
                                        src: item.image,
                                        alt: item.title,
                                        className: 'w-16 h-16 object-cover rounded'
                                    }),
                                    e('div', {key: 'info', className: 'flex-1'}, [
                                        e('div', {key: 'title', className: 'font-medium'}, item.title),
                                        e('div', {key: 'price', className: 'text-sm text-gray-600'}, formatPrice(item.price))
                                    ]),
                                    e('button', {
                                            key: 'toggle',
                                            onClick: () => {
                                                if (selected) {
                                                    setSelectedFBT(selectedFBT.filter(id => id !== item.id));
                                                } else {
                                                    setSelectedFBT([...selectedFBT, item.id]);
                                                }
                                            },
                                            className: `px-4 py-2 rounded-lg font-medium transition-all ${
                                                selected
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`
                                        },
                                        selected
                                            ? t('added_button', '✓ Added')
                                            : t('add_button', '+ Add')
                                    )
                                ]);
                            })
                        )
                    ])
                ])
            ])
        ]);
    }

    // ============================================
    // INITIALIZE APP
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Gstore EPP: Initializing...');
        const host = document.getElementById('gstore-epp-shadow-host');
        if (!host) {
            console.error('Gstore EPP: Host not found');
            return;
        }

        const shadow = host.shadowRoot; // ✅ USE EXISTING SHADOW ROOT
        if (!shadow) {
            console.error('Gstore EPP: Shadow root not initialized');
            return;
        }

        let container = shadow.querySelector('#gstore-app-root') || shadow.querySelector('.gstore-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gstore-app-root';
            container.className = 'gstore-container';
            shadow.appendChild(container);
        }

        try {
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(ProductApp));
            console.log('Gstore EPP: Mounted successfully! ✅');
        } catch (error) {
            console.error('Gstore EPP: Mount failed:', error);
        }
    });

})();
