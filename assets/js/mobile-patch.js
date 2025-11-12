(function(){
    if (typeof window === 'undefined') return;
    var isMobile = function(){ return window.matchMedia && window.matchMedia('(max-width: 768px)').matches; };
    if (!isMobile()) return;

    // Sticky CTA bar
    var boot = window.GSTORE_BOOT || {};
    var price = boot.sale || boot.price || '';
    var regular = boot.regular || '';
    var t = (boot.translations || {});
    var buyNowText = t.buy_now || t['buy_now'] || 'Buy Now';

    var bar = document.createElement('div');
    bar.id = 'gstore-sticky-cta';
    bar.innerHTML = ''
        + '<div class="gstore-sticky-cta-inner">'
        +   '<div class="gstore-prices">'
        +     (regular && price && String(regular) !== String(price) ? '<div class="regular">'+regular+'</div>' : '')
        +     '<div class="sale">'+(price || '')+'</div>'
        +   '</div>'
        +   '<div class="gstore-actions">'
        +     '<button type="button" class="btn-cart" aria-label="Add to cart"></button>'
        +     '<button type="button" class="btn-buy">'+buyNowText+'</button>'
        +   '</div>'
        + '</div>';

    document.body.appendChild(bar);

    // prevent footer overlap
    var adjustPadding = function(){
        var h = bar.getBoundingClientRect().height;
        document.body.style.paddingBottom = h + 'px';
    };
    adjustPadding();
    window.addEventListener('resize', adjustPadding);

    // Wire actions to inner app (shadow DOM) if present
    function getShadow() {
        var host = document.getElementById('gstore-epp-shadow-host');
        if (host && host.shadowRoot) return host.shadowRoot;
        return null;
    }

    function clickSelector(shadow, sel) {
        if (!shadow) return false;
        var el = shadow.querySelector(sel);
        if (!el) return false;
        el.click();
        return true;
    }

    document.querySelector('#gstore-sticky-cta .btn-cart').addEventListener('click', function(){
        var sh = getShadow();
        // Try common selectors inside the app
        if (!clickSelector(sh, '[data-action=\"add-to-cart\"], button.add-to-cart, .btn-add-to-cart')) {
            // fallback: trigger WooCommerce default form submit if exists
            var form = document.querySelector('form.cart');
            if (form) {
                var btn = form.querySelector('button[type=submit]');
                if (btn) btn.click();
            }
        }
    });

    document.querySelector('#gstore-sticky-cta .btn-buy').addEventListener('click', function(){
        var sh = getShadow();
        if (!clickSelector(sh, '[data-action=\"buy-now\"], .btn-buy-now')) {
            // fallback: add then redirect to checkout
            var atc = document.querySelector('button.single_add_to_cart_button');
            if (atc) { atc.click(); setTimeout(function(){ window.location.href='/checkout/'; }, 500); }
        }
    });

    // Mutation observer to keep price in sync
    var priceObserver = new MutationObserver(function(){
        var sh = getShadow();
        if (!sh) return;
        var sale = sh.querySelector('[data-bind=\"price-sale\"], .epp-price-sale, .price .amount');
        var regularNode = sh.querySelector('[data-bind=\"price-regular\"], .epp-price-regular, .price del .amount');
        var saleText = sale ? sale.textContent.trim() : '';
        var regText = regularNode ? regularNode.textContent.trim() : '';
        var saleEl = bar.querySelector('.sale'); var regEl = bar.querySelector('.regular');
        if (saleText) saleEl.textContent = saleText;
        if (regText) {
            regEl.textContent = regText;
            regEl.style.display = (saleText && regText && saleText !== regText) ? 'block' : 'none';
        }
    });
    priceObserver.observe(document.documentElement, {subtree:true, childList:true, characterData:true});

    // Collapse tab when tapping active (mobile only) — fallback safety in case core JS misses it
    document.addEventListener('click', function(e){
        if (!isMobile()) return;
        var sh = getShadow(); if (!sh) return;
        var tabBtn = e.target.closest('.epp-tab-btn, [data-tab]');
        if (!tabBtn || !sh.contains(tabBtn)) return;
        var panel = sh.querySelector('.epp-tabs-panel');
        if (!panel) return;
        if (tabBtn.classList.contains('is-active')) {
            tabBtn.classList.remove('is-active');
            panel.classList.toggle('is-collapsed');
        } else {
            panel.classList.remove('is-collapsed');
        }
    });
})();
