(function () {
    function getStarSettings() {
        const raw = localStorage.getItem('starSettings');
        let parsed = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
        return {
            enabled: parsed && typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
            count: parsed && Number.isFinite(parsed.count) ? parsed.count : 200,
            speed: parsed && typeof parsed.speed === 'string' ? parsed.speed : 'slow',
            color: parsed && typeof parsed.color === 'string' ? parsed.color : 'white'
        };
    }

    function isSpecialTheme() {
        const t = localStorage.getItem('selectedTheme');
        if (t === 'christmas' || t === 'newyears') return true;
        return document.body.classList.contains('christmas-theme') ||
               document.body.classList.contains('newyears-theme');
    }

    function ensureContainer() {
        let container = document.getElementById('starContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'starContainer';
            container.className = 'star-container';
            document.body.insertBefore(container, document.body.firstChild);
        }
        return container;
    }

    function renderStars(settings) {
        const container = ensureContainer();
        if (!settings.enabled || isSpecialTheme()) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }
        container.style.display = '';

        const count = Math.max(50, Math.min(500, Number(settings.count) || 200));
        const speed = settings.speed || 'slow';
        const color = settings.color || 'white';

        const durations = {
            slow:   { min: 4, max: 8 },
            medium: { min: 2, max: 6 },
            fast:   { min: 1, max: 3 }
        };
        const range = durations[speed] || durations.medium;

        const palette = {
            multicolor: ['color1', 'color2', 'color3', 'color4', 'color5'],
            white: ['color1'],
            blue:  ['color2'],
            gold:  ['color3'],
            pink:  ['color4'],
            mint:  ['color5']
        };
        const colorClasses = palette[color] || palette.multicolor;

        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            const size = Math.random() * 2 + 1;
            const duration = Math.random() * (range.max - range.min) + range.min;
            const delay = Math.random() * 5;
            const opacity = Math.random() * 0.7 + 0.3;

            star.className = 'star ' + colorClasses[Math.floor(Math.random() * colorClasses.length)];
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.left = (Math.random() * 100) + '%';
            star.style.top = (Math.random() * 100) + '%';
            star.style.animationDuration = duration + 's';
            star.style.animationDelay = delay + 's';
            star.style.opacity = String(opacity);
            frag.appendChild(star);
        }
        container.innerHTML = '';
        container.appendChild(frag);
    }

    function refresh() { renderStars(getStarSettings()); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'starSettings' || e.key === 'selectedTheme' || e.key === 'customBackground') {
            refresh();
        }
    });

    window.refreshStars = refresh;
})();
