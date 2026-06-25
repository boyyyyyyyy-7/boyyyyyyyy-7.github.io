/* settings-panel.js — Self-contained settings drawer for game pages.
 * Drop <script src="settings-panel.js"></script> anywhere in <body>.
 * Shares localStorage keys with index.html and background-loader.js.
 */
(function () {
    'use strict';

    // ─── CSS ────────────────────────────────────────────────────────────────────
    const css = `
/* Settings floating button */
.sp-btn {
    position: fixed;
    top: 15px;
    right: 15px;
    background: rgba(78, 205, 196, 0.95);
    color: #0a0a0a;
    border: 2px solid rgba(78, 205, 196, 0.5);
    border-radius: 50%;
    width: 55px;
    height: 55px;
    font-size: 22px;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(78,205,196,0.4), 0 0 30px rgba(78,205,196,0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}
.sp-btn:hover {
    background: rgba(78,205,196,1);
    transform: scale(1.15);
    box-shadow: 0 6px 25px rgba(78,205,196,0.6), 0 0 40px rgba(78,205,196,0.4);
}
.sp-btn:active { transform: scale(1.05); }

/* Backdrop */
.sp-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
    z-index: 9998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}
.sp-backdrop.active { opacity: 1; visibility: visible; }

/* Drawer */
.sp-drawer {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: 380px;
    max-width: 92vw;
    overflow-y: auto;
    overflow-x: hidden;
    background: linear-gradient(180deg, rgba(18,20,28,0.97) 0%, rgba(10,12,18,0.97) 100%);
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border-left: 1px solid rgba(78,205,196,0.18);
    z-index: 10000;
    transform: translateX(100%);
    visibility: hidden;
    transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), visibility 0.35s ease;
    box-shadow: -20px 0 50px rgba(0,0,0,0.5);
    color: #f5f6f7;
    font-family: 'Maven Pro', sans-serif;
    display: flex;
    flex-direction: column;
}
.sp-drawer.active { transform: translateX(0); visibility: visible; }
.sp-drawer::-webkit-scrollbar { width: 6px; }
.sp-drawer::-webkit-scrollbar-track { background: transparent; }
.sp-drawer::-webkit-scrollbar-thumb { background: rgba(78,205,196,0.3); border-radius: 3px; }
.sp-drawer::-webkit-scrollbar-thumb:hover { background: rgba(78,205,196,0.5); }

/* Header */
.sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 24px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    position: sticky;
    top: 0;
    z-index: 5;
    backdrop-filter: blur(20px);
}
.sp-header h3 {
    color: #fff;
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.sp-header h3::before {
    content: '';
    width: 4px;
    height: 18px;
    background: linear-gradient(180deg,#4ecdc4,#38b2ac);
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(78,205,196,0.6);
}
.sp-close {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.06);
    border: none;
    color: rgba(255,255,255,0.7);
    font-size: 20px;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.25s ease;
}
.sp-close:hover { background: rgba(255,80,80,0.18); color: #ff6b6b; transform: rotate(90deg); }

/* Body */
.sp-body { flex: 1; padding: 20px 24px; }

/* Section title */
.sp-section {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(78,205,196,0.9);
    margin: 22px 0 12px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
}
.sp-section:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.sp-section::after {
    content: '';
    position: absolute;
    top: -1px; left: 0;
    width: 0; height: 1px;
    background: linear-gradient(90deg,#4ecdc4,transparent);
    transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
}
.sp-drawer.active .sp-section::after { width: 60%; }
.sp-section:first-child::after { display: none; }

/* Option row */
.sp-option { margin-bottom: 18px; }
.sp-option:last-child { margin-bottom: 0; }
.sp-hint {
    display: block;
    color: rgba(255,255,255,0.4);
    font-size: 11px;
    font-weight: 500;
    margin-top: 8px;
    font-style: italic;
    line-height: 1.4;
}

/* 2-col grid for tiles */
.sp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

/* Theme / gradient tiles */
.sp-tile {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.08);
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1),
                border-color 0.2s ease,
                box-shadow 0.25s ease;
    aspect-ratio: 16/9;
    display: flex;
    align-items: flex-end;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.75);
}
.sp-tile::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(78,205,196,0.25), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}
.sp-tile:hover { transform: translateY(-3px) scale(1.02); border-color: rgba(78,205,196,0.45); box-shadow: 0 8px 22px rgba(0,0,0,0.45); }
.sp-tile:hover::after { opacity: 1; }
.sp-tile:active { transform: translateY(-1px) scale(0.99); transition-duration: 0.1s; }
.sp-tile.active {
    border-color: #4ecdc4;
    box-shadow: 0 0 0 2px rgba(78,205,196,0.45), 0 6px 18px rgba(78,205,196,0.32);
}
.sp-tile .sp-check {
    position: absolute;
    top: 6px; right: 6px;
    width: 20px; height: 20px;
    background: #4ecdc4;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #0a0a0a;
    font-size: 12px;
    font-weight: 800;
    opacity: 0;
    transform: scale(0) rotate(-90deg);
    transition: opacity 0.2s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 2px 8px rgba(78,205,196,0.5);
}
.sp-tile.active .sp-check { opacity: 1; transform: scale(1) rotate(0deg); }

/* Solid color circles — 5-col */
.sp-circles {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
}
.sp-circle {
    aspect-ratio: 1;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.08);
    position: relative;
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1),
                border-color 0.2s ease,
                box-shadow 0.25s ease;
}
.sp-circle::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid rgba(78,205,196,0.5);
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
}
.sp-circle:hover { transform: scale(1.18) rotate(-3deg); border-color: rgba(255,255,255,0.3); }
.sp-circle:active { transform: scale(1.05); transition-duration: 0.1s; }
.sp-circle.active {
    border-color: #fff;
    box-shadow: 0 0 0 2px #4ecdc4, 0 0 14px rgba(78,205,196,0.55);
    transform: scale(1.1);
}
.sp-circle.active::after { opacity: 1; transform: scale(1); }

/* Theme tile presets */
.sp-tile.theme-classic   { background: linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%); }
.sp-tile.theme-light     { background: linear-gradient(135deg,#f6f7fb 0%,#e5e7eb 100%); color: #0a0a0a; text-shadow: 0 1px 2px rgba(255,255,255,0.6); }
.sp-tile.theme-christmas { background: linear-gradient(135deg,#1a2b3c 0%,#0d1a26 100%); }
.sp-tile.theme-newyears  { background: linear-gradient(135deg,#0a0a14 0%,#1a0f2e 50%,#2d1b4e 100%); }

/* Upload zone */
.sp-upload { display: flex; gap: 8px; }
.sp-upload label {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    gap: 6px;
    padding: 12px;
    border-radius: 10px;
    background: rgba(78,205,196,0.08);
    border: 1px dashed rgba(78,205,196,0.4);
    color: #4ecdc4;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    margin: 0;
    transition: all 0.2s ease;
    font-family: inherit;
}
.sp-upload label:hover { background: rgba(78,205,196,0.16); border-color: rgba(78,205,196,0.7); border-style: solid; }
.sp-upload input[type="file"] { display: none; }
.sp-upload .sp-clear {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.2s ease;
    font-family: inherit;
}
.sp-upload .sp-clear:hover { background: rgba(255,100,100,0.15); border-color: rgba(255,100,100,0.4); color: #ff8a8a; }
.sp-preview {
    margin-top: 10px;
    height: 80px;
    border-radius: 8px;
    background-size: cover;
    background-position: center;
    border: 1px solid rgba(255,255,255,0.08);
    display: none;
}
.sp-preview.has-image { display: block; }

/* Footer */
.sp-footer {
    padding: 14px 24px 18px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: rgba(255,255,255,0.35);
}
.sp-footer a { color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.2s ease; }
.sp-footer a:hover { color: #4ecdc4; }

/* Hide gear when drawer open */
body.sp-open .sp-btn { opacity: 0; pointer-events: none; transform: scale(0.85); transition: opacity 0.25s ease, transform 0.25s ease; }

/* Entrance animation */
@keyframes sp-item-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.sp-drawer.active .sp-option,
.sp-drawer.active .sp-section { animation: sp-item-in 0.45s cubic-bezier(0.16,1,0.3,1) both; }

@media (max-width: 480px) { .sp-drawer { width: 100%; max-width: 100%; } }
`;

    // ─── HTML ───────────────────────────────────────────────────────────────────
    const html = `
<button class="sp-btn" id="spBtn" title="Settings" aria-label="Open settings">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
</button>

<div class="sp-backdrop" id="spBackdrop"></div>

<aside class="sp-drawer" id="spDrawer" role="dialog" aria-label="Settings" aria-modal="true">

    <div class="sp-header">
        <h3>Settings</h3>
        <button class="sp-close" id="spClose" aria-label="Close settings">&times;</button>
    </div>

    <div class="sp-body">

        <!-- THEME -->
        <div class="sp-section">Theme</div>
        <div class="sp-option">
            <div class="sp-grid" id="spThemeGrid" role="radiogroup" aria-label="Theme">
                <div class="sp-tile theme-classic"   data-theme="classic"   role="radio" tabindex="0">Classic<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile theme-light"     data-theme="light"     role="radio" tabindex="0">Light<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile theme-christmas" data-theme="christmas" role="radio" tabindex="0">Christmas<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile theme-newyears"  data-theme="newyears"  role="radio" tabindex="0">New Year's<div class="sp-check">&#10003;</div></div>
            </div>
            <small class="sp-hint">Tap a theme to apply it across all pages instantly.</small>
        </div>

        <!-- GRADIENTS -->
        <div class="sp-section">Gradient</div>
        <div class="sp-option">
            <div class="sp-grid" id="spGradientGrid" role="radiogroup" aria-label="Gradient background">
                <div class="sp-tile" data-bg="linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);" role="radio" tabindex="0">Deep Space<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(to right,#0f2027,#203a43,#2c5364)" style="background:linear-gradient(to right,#0f2027,#203a43,#2c5364);" role="radio" tabindex="0">Ocean Breeze<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(45deg,#1e3c72,#2a5298,#7db9e8)" style="background:linear-gradient(45deg,#1e3c72,#2a5298,#7db9e8);" role="radio" tabindex="0">Blue Horizon<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#051a2a 0%,#0b4a6a 100%)" style="background:linear-gradient(135deg,#051a2a 0%,#0b4a6a 100%);" role="radio" tabindex="0">Ocean<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#1a0b1f 0%,#ff8a5b 100%)" style="background:linear-gradient(135deg,#1a0b1f 0%,#ff8a5b 100%);" role="radio" tabindex="0">Sunset<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#06150f 0%,#1f7a5a 100%)" style="background:linear-gradient(135deg,#06150f 0%,#1f7a5a 100%);" role="radio" tabindex="0">Forest<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#050510 0%,#a855f7 100%)" style="background:linear-gradient(135deg,#050510 0%,#a855f7 100%);" role="radio" tabindex="0">Neon<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#140f24 0%,#d8b4fe 100%)" style="background:linear-gradient(135deg,#140f24 0%,#d8b4fe 100%);" role="radio" tabindex="0">Lavender<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#0a2a24 0%,#38bdf8 100%)" style="background:linear-gradient(135deg,#0a2a24 0%,#38bdf8 100%);" role="radio" tabindex="0">Teal Glow<div class="sp-check">&#10003;</div></div>
                <div class="sp-tile" data-bg="linear-gradient(135deg,#2a0a1a 0%,#ff4d4d 100%)" style="background:linear-gradient(135deg,#2a0a1a 0%,#ff4d4d 100%);" role="radio" tabindex="0">Red Glow<div class="sp-check">&#10003;</div></div>
            </div>
        </div>

        <!-- SOLID COLORS -->
        <div class="sp-section">Solid Color</div>
        <div class="sp-option">
            <div class="sp-circles" id="spSolidGrid" role="radiogroup" aria-label="Solid color background">
                <div class="sp-circle" data-bg="#0a0a0a" style="background:#0a0a0a;" title="Dark Black"  role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#1a1a1a" style="background:#1a1a1a;" title="Dark Gray"   role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#0d1b2a" style="background:#0d1b2a;" title="Navy Blue"   role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#0b1320" style="background:#0b1320;" title="Midnight"    role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#111827" style="background:#111827;" title="Slate"       role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#0a2a24" style="background:#0a2a24;" title="Deep Teal"   role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#2a0a1a" style="background:#2a0a1a;" title="Burgundy"    role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#0f2a1a" style="background:#0f2a1a;" title="Pine"        role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#f6f7fb" style="background:#f6f7fb;" title="Light Paper" role="radio" tabindex="0"></div>
                <div class="sp-circle" data-bg="#e5e7eb" style="background:#e5e7eb;" title="Light Gray"  role="radio" tabindex="0"></div>
            </div>
        </div>

        <!-- CUSTOM IMAGE -->
        <div class="sp-section">Custom Image</div>
        <div class="sp-option">
            <div class="sp-upload">
                <label for="spFileInput">&#128247; Choose Image<input type="file" id="spFileInput" accept="image/*"></label>
                <button type="button" class="sp-clear" id="spClearBtn">Reset</button>
            </div>
            <div class="sp-preview" id="spPreview"></div>
            <small class="sp-hint">Image is stored locally on your device only.</small>
        </div>

    </div>

    <div class="sp-footer">
        <span>vS3.9</span>
        <span>&copy; 2026 Brayden is Tall Games</span>
    </div>

</aside>
`;

    // ─── INJECT CSS + HTML ──────────────────────────────────────────────────────
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

    // ─── LOGIC ──────────────────────────────────────────────────────────────────
    const btn      = document.getElementById('spBtn');
    const drawer   = document.getElementById('spDrawer');
    const backdrop = document.getElementById('spBackdrop');
    const closeBtn = document.getElementById('spClose');

    // Wire the old header settings link to open the drawer instead (if present)
    document.querySelectorAll('a[href="background-settings.html"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            openDrawer();
        });
    });

    function openDrawer()  { drawer.classList.add('active'); backdrop.classList.add('active'); document.body.classList.add('sp-open'); }
    function closeDrawer() { drawer.classList.remove('active'); backdrop.classList.remove('active'); document.body.classList.remove('sp-open'); }

    btn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('active')) closeDrawer();
    });

    // ─── Background helpers ──────────────────────────────────────────────────────
    function applyBg(value) {
        const body = document.body;
        body.style.backgroundImage = '';
        body.style.backgroundColor = '';
        body.style.backgroundSize  = '';
        body.style.backgroundPosition = '';
        body.style.backgroundAttachment = '';

        if (!value) return;
        if (value.startsWith('url')) {
            body.style.backgroundImage = value;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundAttachment = 'fixed';
        } else if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
            body.style.backgroundImage = value;
            body.style.backgroundSize = 'cover';
            body.style.backgroundAttachment = 'fixed';
        } else {
            body.style.backgroundColor = value;
        }
    }

    function pickTheme(theme) {
        localStorage.removeItem('customBackground');
        localStorage.removeItem('bgType');
        localStorage.setItem('selectedTheme', theme);
        if (window.applyUserBackground) window.applyUserBackground();
        refreshActive();
    }

    function pickCustomBg(value) {
        localStorage.removeItem('selectedTheme');
        localStorage.setItem('customBackground', value);
        localStorage.setItem('bgType', value.startsWith('url') ? 'image' : value.startsWith('linear') ? 'gradient' : 'color');
        if (window.applyUserBackground) {
            window.applyUserBackground();
        } else {
            applyBg(value);
        }
        refreshActive();
    }

    // ─── Active state sync ───────────────────────────────────────────────────────
    function refreshActive() {
        const savedTheme = localStorage.getItem('selectedTheme');
        const savedBg    = localStorage.getItem('customBackground');

        document.querySelectorAll('#spThemeGrid .sp-tile').forEach(function (t) {
            t.classList.toggle('active', !savedBg && t.dataset.theme === savedTheme);
        });
        document.querySelectorAll('#spGradientGrid .sp-tile').forEach(function (t) {
            t.classList.toggle('active', savedBg === t.dataset.bg);
        });
        document.querySelectorAll('#spSolidGrid .sp-circle').forEach(function (c) {
            c.classList.toggle('active', savedBg === c.dataset.bg);
        });

        var preview = document.getElementById('spPreview');
        if (preview) {
            if (savedBg && savedBg.startsWith('url')) {
                preview.style.backgroundImage = savedBg;
                preview.classList.add('has-image');
            } else {
                preview.style.backgroundImage = '';
                preview.classList.remove('has-image');
            }
        }
    }

    // ─── Wire theme tiles ────────────────────────────────────────────────────────
    document.querySelectorAll('#spThemeGrid .sp-tile').forEach(function (tile) {
        tile.addEventListener('click', function () { pickTheme(tile.dataset.theme); });
        tile.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickTheme(tile.dataset.theme); }
        });
    });

    // ─── Wire gradient tiles ─────────────────────────────────────────────────────
    document.querySelectorAll('#spGradientGrid .sp-tile').forEach(function (tile) {
        tile.addEventListener('click', function () { pickCustomBg(tile.dataset.bg); });
        tile.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCustomBg(tile.dataset.bg); }
        });
    });

    // ─── Wire solid color circles ─────────────────────────────────────────────────
    document.querySelectorAll('#spSolidGrid .sp-circle').forEach(function (circle) {
        circle.addEventListener('click', function () { pickCustomBg(circle.dataset.bg); });
        circle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCustomBg(circle.dataset.bg); }
        });
    });

    // ─── File upload ──────────────────────────────────────────────────────────────
    var fileInput = document.getElementById('spFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var dataUrl = String(ev.target.result || '');
                if (dataUrl) pickCustomBg('url(' + dataUrl + ')');
            };
            reader.readAsDataURL(file);
        });
    }

    // ─── Clear / reset button ────────────────────────────────────────────────────
    var clearBtn = document.getElementById('spClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (fileInput) fileInput.value = '';
            pickTheme('christmas');
        });
    }

    // ─── Storage sync (other tabs) ───────────────────────────────────────────────
    window.addEventListener('storage', function (e) {
        if (['selectedTheme', 'customBackground', 'bgType'].includes(e.key)) refreshActive();
    });

    // ─── Init ────────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshActive);
    } else {
        refreshActive();
    }

})();
