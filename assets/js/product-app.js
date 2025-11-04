(function(){
    console.log('Gstore EPP: product-app.js loaded');

    function money(n){ var x = Number(n||0); return isFinite(x) ? x.toFixed(2) : "0.00"; }
    function gel(n){ return "₾" + money(n); }

    function mount(){
        console.log('Gstore EPP: mount() called');

        var BOOT = window.GSTORE_BOOT || {};
        if (!BOOT.productId) {
            console.error('GSTORE_BOOT missing or invalid:', BOOT);
            alert('Error: Product data not loaded. Check console for details.');
            return;
        }

        console.log('Gstore EPP: Boot data valid', BOOT);

        // Check React
        var React = window.React, ReactDOM = window.ReactDOM;
        if (!React || !ReactDOM){
            console.error('React not loaded. React:', !!React, 'ReactDOM:', !!ReactDOM);
            alert('Error: React not loaded. Check console for details.');
            return;
        }

        console.log('Gstore EPP: React loaded successfully');

        var e = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useMemo = React.useMemo;

        function SimpleTest(){
            return e("div", {style:{padding:'20px',background:'#f0f0f0',border:'2px solid #333'}}, [
                e("h1", {key:"h1"}, "Gstore EPP Loaded Successfully! ✅"),
                e("p", {key:"p1"}, "Product ID: " + BOOT.productId),
                e("p", {key:"p2"}, "Title: " + BOOT.title),
                e("p", {key:"p3"}, "Brand: " + BOOT.brand),
                e("p", {key:"p4"}, "Model: " + BOOT.model),
                e("p", {key:"p5"}, "Group Key: " + BOOT.groupKey),
                e("button", {
                    key:"btn",
                    onClick:function(){ alert('Button works!'); },
                    style:{padding:'10px 20px',background:'#007cba',color:'#fff',border:'none',cursor:'pointer'}
                }, "Test Button")
            ]);
        }

        // Mount
        var host = document.getElementById('gstore-epp-shadow-host');
        if (!host){
            console.error('Host #gstore-epp-shadow-host not found');
            alert('Error: Shadow host not found');
            return;
        }

        console.log('Gstore EPP: Host found', host);

        try {
            // Try without Shadow DOM first for debugging
            var appRoot = document.createElement('div');
            appRoot.style.cssText = 'padding:20px;background:#fff;';
            host.appendChild(appRoot);

            console.log('Gstore EPP: Rendering React...');
            ReactDOM.createRoot(appRoot).render(e(SimpleTest));
            console.log('Gstore EPP: React rendered successfully! ✅');
        } catch(error) {
            console.error('Gstore EPP: Render failed', error);
            alert('Error: ' + error.message);
        }
    }

    // Wait for DOM and React
    function init() {
        console.log('Gstore EPP: Initializing...');
        if (document.readyState === 'loading') {
            console.log('Gstore EPP: Waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', mount);
        } else {
            console.log('Gstore EPP: DOM already loaded, mounting immediately');
            mount();
        }
    }

    init();
})();