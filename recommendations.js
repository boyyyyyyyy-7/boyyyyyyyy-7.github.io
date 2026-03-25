// recommendations.js - Tier-weighted game recommendation engine
(function() {
    const TIER_1 = [
        { name: 'Arcade Tennis', url: 'arcade-tennis.html' },
        { name: 'Cookie Clicker', url: 'cookie-clicker.html' },
        { name: 'Agario Minigame', url: 'agario-minigame.html' },
        { name: 'Slope', url: 'slope.html' },
        { name: 'Rocketgoal', url: 'rocketgoal.html' },
        { name: 'Stickman Hook', url: 'stickman-hook.html' },
        { name: 'Stack', url: 'stack.html' },
        { name: 'Paper.io 2', url: 'paper-io-2.html' },
        { name: 'Burrito Bison', url: 'burrito-bison.html' },
        { name: 'Hole.io', url: 'hole-io.html' },
        { name: 'Tunnel Rush', url: 'tunnel-rush.html' },
        { name: 'Bloons TD 5', url: 'bloons-td-5.html' },
        { name: 'Crazy Cattle 3D', url: 'crazy-cattle-3d.html' },
        { name: 'Curve Rush', url: 'curve-rush.html' },
        { name: 'Drive Mad', url: 'drive-mad.html' },
        { name: 'Escape Road 2', url: 'escape-road-2.html' },
        { name: 'Smash Karts', url: 'smash-karts.html' },
        { name: 'Speed Stars', url: 'speed-stars.html' },
        { name: 'Ragdoll Archers', url: 'ragdoll-archers.html' },
        { name: 'Slow Roads', url: 'slow-roads.html' },
        { name: 'Golf Orbit', url: 'golf-orbit.html' },
        { name: 'Traffic Road', url: 'traffic-road.html' },
        { name: 'Granny', url: 'granny.html' },
        { name: 'Cowboy Safari', url: 'cowboy-safari.html' },
        { name: 'Slope Rider', url: 'slope-rider.html' },
        { name: 'Ramp Xtreme', url: 'ramp-xtreme.html' }
    ];

    const TIER_2 = [
        { name: 'Spacebar Clicker', url: 'spacebar-clicker.html' },
        { name: 'Sand Game', url: 'sand-game.html' },
        { name: 'Fluid Simulator', url: 'fluid-simulator.html' },
        { name: 'Ragdoll Hit Stickman', url: 'ragdoll-hit-stickman.html' },
        { name: 'Geometry Lite', url: 'geometry-lite.html' },
        { name: 'Crossy Road', url: 'crossy-road.html' },
        { name: 'Escape Road', url: 'escape-road.html' },
        { name: 'Schoolboy Runaway', url: 'schoolboy-runaway.html' },
        { name: 'Slender Multiplayer', url: 'slender-multiplayer.html' },
        { name: 'Crazy Chicken 3D', url: 'crazy-chicken-3d.html' },
        { name: 'Crazy Kitty 3D', url: 'crazy-kitty-3d.html' },
        { name: 'Wave Dash', url: 'wave-dash.html' },
        { name: 'Melon Sandbox', url: 'melon-sandbox.html' },
        { name: 'Chill Guy Clicker', url: 'chill-guy-clicker.html' },
        { name: 'Shell Shockers', url: 'shell-shockers.html' },
        { name: 'Minecraft', url: 'minecraft.html' },
        { name: '1v1.lol', url: '1v1-lol.html' },
        { name: 'Tetris', url: 'tetris.html' },
        { name: 'Wordle Plus', url: 'wordle-plus.html' },
        { name: 'Breaking the Bank', url: 'breaking-the-bank.html' },
        { name: 'Duck Life 3', url: 'duck-life-3.html' },
        { name: 'Learn to Fly', url: 'learn-to-fly-1.html' },
        { name: 'Learn to Fly 2', url: 'learn-to-fly-2.html' },
        { name: 'Learn to Fly Idle', url: 'learn-to-fly-idle.html' },
        { name: 'Raft Wars', url: 'raft-wars.html' },
        { name: 'Cars', url: 'cars.html' }
    ];

    const T1_URLS = new Set(TIER_1.map(g => g.url));
    const currentPage = window.location.pathname.split('/').pop();

    let recentGames = [];
    try { recentGames = JSON.parse(localStorage.getItem('bgt_recentGames')) || []; } catch(e) {}

    const recentCount = Math.min(recentGames.length, 4);
    const tier1Chance = Math.min(0.55 + (recentCount * 0.035), 0.65);
    const recentUrls = recentGames.map(g => g.url);
    const filtered1 = TIER_1.filter(g => g.url !== currentPage && !recentUrls.includes(g.url));
    const filtered2 = TIER_2.filter(g => g.url !== currentPage && !recentUrls.includes(g.url));

    const picks = [];
    const usedUrls = new Set();
    for (let i = 0; i < 4; i++) {
        const roll = Math.random();
        let pool = (roll < tier1Chance && filtered1.length > 0) ? filtered1 : (filtered2.length > 0 ? filtered2 : filtered1);
        const remaining = pool.filter(g => !usedUrls.has(g.url));
        if (remaining.length === 0) continue;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        picks.push(pick);
        usedUrls.add(pick.url);
    }

    if (picks.length > 0) {
        document.addEventListener('DOMContentLoaded', () => {
            const css = document.createElement('style');
            css.textContent = `
                .bgt-rec-wrap {
                    max-width: 1400px;
                    margin: 30px auto 0;
                    padding: 0 20px;
                    position: relative;
                    z-index: 2;
                }
                .bgt-rec-box {
                    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 18px;
                    padding: 35px 30px;
                    backdrop-filter: blur(12px) saturate(160%);
                    -webkit-backdrop-filter: blur(12px) saturate(160%);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                }
                .bgt-rec-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 22px;
                }
                .bgt-rec-header h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                    font-family: "Maven Pro", Arial, sans-serif;
                    letter-spacing: -0.3px;
                }
                .bgt-rec-header span {
                    font-size: 1.4rem;
                }
                .bgt-rec-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 14px;
                }
                .bgt-rec-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 25px 12px;
                    background: rgba(255,255,255,0.06);
                    border: 1.5px solid rgba(255,255,255,0.1);
                    border-radius: 15px;
                    color: #fff;
                    text-decoration: none;
                    font-family: "Maven Pro", Arial, sans-serif;
                    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
                    cursor: pointer;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    backdrop-filter: blur(3px) saturate(160%);
                    -webkit-backdrop-filter: blur(3px) saturate(160%);
                }
                .bgt-rec-card:hover {
                    background: rgba(255,255,255,0.18);
                    border-color: #4ecdc4;
                    transform: scale(1.08);
                    z-index: 10;
                }
                .bgt-rec-card:active {
                    transform: scale(0.98);
                }
                .bgt-rec-card p {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0;
                    transition: color 0.3s ease;
                    position: relative;
                    z-index: 1;
                }
                .bgt-rec-card:hover p {
                    color: #4ecdc4;
                    text-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
                }
                .bgt-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    padding: 3px 7px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    z-index: 2;
                    color: #fff;
                    animation: bgt-bp 2s infinite;
                }
                .bgt-badge-hot {
                    background: linear-gradient(45deg, #ff4e50, #f9d423);
                    box-shadow: 0 2px 5px rgba(255, 78, 80, 0.4);
                }
                .bgt-badge-pop {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    box-shadow: 0 2px 5px rgba(102, 126, 234, 0.4);
                }
                @keyframes bgt-bp {
                    0%,100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @media (max-width: 768px) {
                    .bgt-rec-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .bgt-rec-card { padding: 20px 10px; }
                    .bgt-rec-card p { font-size: 0.95rem; }
                    .bgt-rec-header h2 { font-size: 1.2rem; }
                    .bgt-rec-box { padding: 25px 18px; }
                }
            `;
            document.head.appendChild(css);

            const wrap = document.createElement('div');
            wrap.className = 'bgt-rec-wrap';

            const box = document.createElement('div');
            box.className = 'bgt-rec-box';

            const header = document.createElement('div');
            header.className = 'bgt-rec-header';
            header.innerHTML = '<span>🎮</span><h2>More Unblocked Games for School</h2>';
            box.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'bgt-rec-grid';

            picks.forEach(game => {
                const card = document.createElement('a');
                card.href = game.url;
                card.className = 'bgt-rec-card';

                const badge = document.createElement('div');
                badge.className = T1_URLS.has(game.url) ? 'bgt-badge bgt-badge-hot' : 'bgt-badge bgt-badge-pop';
                badge.innerHTML = T1_URLS.has(game.url) ? '<span>🔥</span> Hot' : '<span>⭐</span> Popular';
                card.appendChild(badge);

                const p = document.createElement('p');
                p.textContent = game.name;
                card.appendChild(p);

                grid.appendChild(card);
            });

            box.appendChild(grid);
            wrap.appendChild(box);

            const footer = document.querySelector('footer');
            if (footer) {
                footer.parentNode.insertBefore(wrap, footer);
            } else {
                document.body.appendChild(wrap);
            }
        });
    }
})();
