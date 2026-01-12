/**
 * Brayden is tall games - Site-Wide Ad Management System
 * Handles: 
 * - Dynamic injection of Ezoic, Gatekeeper, and Nap5k
 * - Fullscreen removal (prevent ad fraud)
 * - UI Overlap detection and intrusive element nuking
 * - Viewport width safety check (min 1100px)
 * - Protocol-aware loading (file:// check)
 */

(function () {
    const activeScriptIds = ['nap5k-main-script', 'ezoic-script', 'gk-1', 'gk-2'];

    function clearAdSystems() {
        activeScriptIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        document.querySelectorAll('script[src*="ezojs"], script[src*="gatekeeper"], script[src*="nap5k"], script[src*="googlesyndication"], script[src*="doubleclick"]').forEach(s => s.remove());
        document.querySelectorAll('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="nap5k"], iframe[src*="ezojs"], iframe[src*="gatekeeper"]').forEach(f => f.remove());
        document.querySelectorAll('ins.adsbygoogle').forEach(i => i.remove());
    }

    clearAdSystems();
})();
