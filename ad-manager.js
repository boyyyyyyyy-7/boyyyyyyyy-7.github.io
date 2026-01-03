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
    const nap5kZone = '10410222';
    const nap5kSrc = 'https://nap5k.com/tag.min.js';
    const ezoicSrc = 'https://www.ezojs.com/ezoic/sa.min.js';
    const gatekeeperSrcs = [
        'https://cmp.gatekeeperconsent.com/min.js',
        'https://the.gatekeeperconsent.com/cmp.min.js'
    ];

    const activeScriptIds = ['nap5k-main-script', 'ezoic-script', 'gk-1', 'gk-2'];
    const minSafeWidth = 1100;

    function isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }

    function clearAdSystems(reason) {
        console.log('Ad Status: Disabling systems - ' + reason);
        activeScriptIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Nuclear cleanup of foreign scripts/tags
        document.querySelectorAll('script[src*="ezojs"], script[src*="gatekeeper"], script[src*="nap5k"]').forEach(s => s.remove());
    }

    function checkAndNuke() {
        const isSmallScreen = window.innerWidth < minSafeWidth;
        const scriptExists = document.getElementById('nap5k-main-script');

        if (isSmallScreen || document.fullscreenElement) {
            if (scriptExists) clearAdSystems(isSmallScreen ? 'Screen too small' : 'Fullscreen active');
            return;
        }

        // Critical UI elements to protect
        const buttons = document.querySelectorAll('.back-button, .fullscreen-button, .game-frame, .header, #gameFrame');

        // Find elements that aren't part of the site's main content
        const foreignElements = Array.from(document.body.children).filter(el => {
            return !el.id.includes('ad-manager') &&
                !el.hasAttribute('src') && // Skip our own script tags
                !el.closest('.container') &&
                el.tagName !== 'SCRIPT' &&
                el.tagName !== 'INS';
        });

        let overlapFound = false;
        for (const el of foreignElements) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) continue;

            for (const btn of buttons) {
                if (isOverlapping(rect, btn.getBoundingClientRect())) {
                    console.warn('Ad Management: UI OVERLAP DETECTED! Removing element.');
                    el.remove();
                    overlapFound = true;
                    break;
                }
            }
            if (overlapFound) break;
        }

        if (overlapFound) {
            clearAdSystems('UI Overlap detected');
        } else if (!scriptExists) {
            injectAdSystems();
        }
    }

    function injectAdSystems() {
        if (document.fullscreenElement || window.innerWidth < minSafeWidth) return;
        console.log('Ad Status: Systems enabled');

        const isLocal = window.location.protocol === 'file:';

        // 1. Gatekeeper CMP
        if (!isLocal) {
            gatekeeperSrcs.forEach((src, idx) => {
                const s = document.createElement('script');
                s.id = 'gk-' + (idx + 1);
                s.src = src;
                s.dataset.cfasync = 'false';
                document.head.appendChild(s);
            });
        }

        // 2. Ezoic
        if (!isLocal) {
            window.ezstandalone = window.ezstandalone || {};
            ezstandalone.cmd = ezstandalone.cmd || [];
            const ez = document.createElement('script');
            ez.id = 'ezoic-script';
            ez.async = true;
            ez.src = ezoicSrc;
            document.head.appendChild(ez);
        } else {
            console.log('Ad Status: Skipping Ezoic (Local protocol detected)');
        }

        // 3. Nap5k
        const n5 = document.createElement('script');
        n5.id = 'nap5k-main-script';
        n5.dataset.zone = nap5kZone;
        n5.src = nap5kSrc;
        n5.onerror = () => console.error('Ad Status: Nap5k failed to load');
        n5.onload = () => console.log('Ad Status: Nap5k loaded');
        document.body.appendChild(n5);
    }

    // Real-time protection
    const observer = new MutationObserver(checkAndNuke);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    else window.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }));

    window.addEventListener('resize', checkAndNuke);
    document.addEventListener('fullscreenchange', checkAndNuke);
    setInterval(checkAndNuke, 3000);
    checkAndNuke();
})();
