// recommendations.js — related-games engine (v2)
//
// What changed in v2 and WHY (SEO + UX):
//   • DETERMINISTIC instead of random. v1 used Math.random(), so every page
//     load showed a different set of links. Search engines then saw an
//     unstable internal-link graph (different links each crawl), which dilutes
//     how link signals flow between pages. v2 always renders the same links for
//     a given page, so the link graph is stable and crawlable.
//   • TOPICAL. v2 recommends same-GENRE games first (e.g. a racing game links
//     to other racing games). Topical internal linking is one of the strongest
//     on-site SEO signals and is also better for players.
//   • COMPLETE. v1's tier lists were missing several live games (Trash Pandas,
//     Front Wars, Ant Escape, Squid Shooter…), so those pages were
//     never recommended anywhere. v2's GAMES list is the single source of truth
//     for every current game — add a new game in ONE place and it joins the
//     recommendation graph automatically.
//
// HOW TO EXTEND: add one row to GAMES below. `genre` controls which games it is
// grouped with; `hot` controls the badge (🔥 Hot vs ⭐ Popular) and gives it
// priority when filling out a row. That's it — no other file needs touching.
(function () {
    // ---- Single source of truth: every live game, its genre, and hot flag ----
    const GAMES = [
        // io / multiplayer
        { name: '1v1.lol',              url: '1v1-lol.html',              genre: 'io',       hot: false },
        { name: 'Agario Minigame',      url: 'agario-minigame.html',      genre: 'io',       hot: true  },
        { name: 'Hole.io',              url: 'hole-io.html',              genre: 'io',       hot: true  },
        { name: 'Paper.io 2',           url: 'paper-io-2.html',           genre: 'io',       hot: true  },
        { name: 'Smash Karts',          url: 'smash-karts.html',          genre: 'io',       hot: true  },
        // runner / arcade endless
        { name: 'Slope',                url: 'slope.html',                genre: 'runner',   hot: true  },
        { name: 'Slope Rider',          url: 'slope-rider.html',          genre: 'runner',   hot: true  },
        { name: 'Tunnel Rush',          url: 'tunnel-rush.html',          genre: 'runner',   hot: true  },
        { name: 'Curve Rush',           url: 'curve-rush.html',           genre: 'runner',   hot: true  },
        { name: 'Geometry Lite',        url: 'geometry-lite.html',        genre: 'runner',   hot: false },
        { name: 'Speed Stars',          url: 'speed-stars.html',          genre: 'runner',   hot: true  },
        // racing / driving
        { name: 'Drive Mad',            url: 'drive-mad.html',            genre: 'racing',   hot: true  },
        { name: 'Traffic Road',         url: 'traffic-road.html',         genre: 'racing',   hot: true  },
        { name: 'Cars',                 url: 'cars.html',                 genre: 'racing',   hot: false },
        { name: 'Escape Road 2',        url: 'escape-road-2.html',        genre: 'racing',   hot: true  },
        { name: 'Slow Roads',           url: 'slow-roads.html',           genre: 'racing',   hot: true  },
        { name: 'Ramp Xtreme',          url: 'ramp-xtreme.html',          genre: 'racing',   hot: true  },
        // physics / skill
        { name: 'Stickman Hook',        url: 'stickman-hook.html',        genre: 'physics',  hot: true  },
        { name: 'Burrito Bison',        url: 'burrito-bison.html',        genre: 'physics',  hot: true  },
        { name: 'Raft Wars',            url: 'raft-wars.html',            genre: 'physics',  hot: false },
        { name: 'Ragdoll Archers',      url: 'ragdoll-archers.html',      genre: 'physics',  hot: true  },
        { name: 'Ragdoll Hit Stickman', url: 'ragdoll-hit-stickman.html', genre: 'physics',  hot: false },
        { name: 'Trash Pandas',         url: 'trash-pandas.html',         genre: 'physics',  hot: false },
        // clicker / incremental
        { name: 'Cookie Clicker',       url: 'cookie-clicker.html',       genre: 'clicker',  hot: true  },
        { name: 'Spacebar Clicker',     url: 'spacebar-clicker.html',     genre: 'clicker',  hot: false },
        { name: 'Breaking the Bank',    url: 'breaking-the-bank.html',    genre: 'clicker',  hot: false },
        // idle / progression
        { name: 'Duck Life 3',          url: 'duck-life-3.html',          genre: 'idle',     hot: false },
        { name: 'Learn to Fly',         url: 'learn-to-fly-1.html',       genre: 'idle',     hot: false },
        { name: 'Learn to Fly 2',       url: 'learn-to-fly-2.html',       genre: 'idle',     hot: false },
        { name: 'Learn to Fly Idle',    url: 'learn-to-fly-idle.html',    genre: 'idle',     hot: false },
        // sandbox / simulation
        { name: 'Sand Game',            url: 'sand-game.html',            genre: 'sandbox',  hot: false },
        { name: 'Fluid Simulator',      url: 'fluid-simulator.html',      genre: 'sandbox',  hot: false },
        // shooter
        { name: 'Cowboy Safari',        url: 'cowboy-safari.html',        genre: 'shooter',  hot: true  },
        // horror / escape
        { name: 'Granny',               url: 'granny.html',               genre: 'horror',   hot: true  },
        { name: 'Slender Multiplayer',  url: 'slender-multiplayer.html',  genre: 'horror',   hot: false },
        // 3d animal action
        { name: 'Crazy Cattle 3D',      url: 'crazy-cattle-3d.html',      genre: '3d',       hot: true  },
        { name: 'Crazy Chicken 3D',     url: 'crazy-chicken-3d.html',     genre: '3d',       hot: false },
        // sports
        { name: 'Arcade Tennis',        url: 'arcade-tennis.html',        genre: 'sports',   hot: true  },
        { name: 'Golf Orbit',           url: 'golf-orbit.html',           genre: 'sports',   hot: true  },
        { name: 'Rocketgoal',           url: 'rocketgoal.html',           genre: 'sports',   hot: true  },
        // strategy
        { name: 'Bloons TD 5',          url: 'bloons-td-5.html',          genre: 'strategy', hot: true  },
        { name: 'Front Wars',           url: 'front-wars.html',           genre: 'strategy', hot: false },
        // arcade
        { name: 'Crossy Road',          url: 'crossy-road.html',          genre: 'arcade',   hot: false },
        { name: 'Stack',                url: 'stack.html',                genre: 'arcade',   hot: true  },
        { name: 'Ant Escape',           url: 'ant-escape.html',           genre: 'arcade',   hot: false },
        // puzzle / word
        { name: 'Tetris',               url: 'tetris.html',               genre: 'puzzle',   hot: false },
        { name: 'Wordle+',              url: 'wordle-plus.html',          genre: 'puzzle',   hot: false }
    ];

    const NUM_PICKS = 4;

    // Which page are we on? (e.g. "drive-mad.html")
    const currentSlug = window.location.pathname.split('/').pop() || 'index.html';
    const current = GAMES.find(g => g.url === currentSlug);
    const currentGenre = current ? current.genre : null;

    // Personalisation for real visitors: skip games they just played. Crawlers
    // have an empty localStorage, so they always get the deterministic default.
    let recentUrls = [];
    try { recentUrls = (JSON.parse(localStorage.getItem('bgt_recentGames')) || []).map(g => g.url); } catch (e) {}
    const exclude = new Set([currentSlug, ...recentUrls]);

    // Build the pick order deterministically:
    //   1) same-genre games (topical cluster),
    //   2) then hot games from other genres,
    //   3) then the remaining games.
    // Array order is preserved throughout, so the output is identical every load.
    const sameGenre = GAMES.filter(g => g.genre === currentGenre && !exclude.has(g.url));
    const otherGames = GAMES.filter(g => g.genre !== currentGenre && !exclude.has(g.url));
    const hotOthers = otherGames.filter(g => g.hot);
    const coldOthers = otherGames.filter(g => !g.hot);

    const picks = [...sameGenre, ...hotOthers, ...coldOthers].slice(0, NUM_PICKS);

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
                badge.className = game.hot ? 'bgt-badge bgt-badge-hot' : 'bgt-badge bgt-badge-pop';
                badge.innerHTML = game.hot ? '<span>🔥</span> Hot' : '<span>⭐</span> Popular';
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
