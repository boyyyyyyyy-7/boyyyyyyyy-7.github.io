import os
import re

# Game descriptions database - unique content for each game
game_descriptions = {
    "smash-karts": {
        "title": "Smash Karts",
        "hook": "Smash Karts takes everything fun about kart racers and cranks it up by letting you blast your opponents with weapons. It's not enough to just drive fast—you need to grab power-ups, time your attacks, and survive the chaos while still trying to cross the finish line first. Pure mayhem on wheels.",
        "hook2": "The maps are compact arenas filled with boxes containing random weapons. You might get a rocket launcher, mines, or a machine gun. Luck plays a role, but smart players know when to grab boxes and when to focus on racing. Sometimes hanging back in third place gets you better weapons than leading the pack.",
        "controls": "WASD or arrow keys control your kart. Space bar triggers your current weapon. That's really it—simple controls let you focus on the actual racing and combat. The karts handle arcadey and responsive, so you can drift around corners while lining up shots.",
        "controls2": "Each match throws you into a small arena with other players. Race laps while collecting weapons from boxes scattered around the track. Hit opponents to slow them down or knock them off course. First to complete all laps wins, but you can still place high by taking out the competition.",
        "tips": "Don't tunnel vision on first place. Sometimes the leader is actually the easiest target because everyone else is shooting at them too. Hang around second or third, let others waste their ammo on each other, then make your move on the final lap.",
        "tips2": "Save your best weapons. If you get a rocket or something powerful, don't waste it on someone in last place. Wait until you can knock the leader back or defend yourself when you're in front. And always grab boxes even if you have a weapon—denying them to others is just as valuable.",
        "features": ["Fast-paced kart racing with combat", "Random weapon drops keep matches unpredictable", "Multiple arena maps with different layouts", "Quick 3-minute matches perfect for breaks", "Smooth online multiplayer", "Customizable kart skins", "No pay-to-win mechanics"]
    },
    "basketball-stars": {
        "title": "Basketball Stars",
        "hook": "Basketball Stars strips hoops down to quick 1v1 or 2v2 matchups where skill actually matters. No complicated plays, no managing a full team—just you trying to outplay your opponent with crossovers, blocks, and perfectly timed shots. It's pick-up basketball at its purest.",
        "hook2": "What makes this addictive is how much depth the simple controls hide. You can fake out defenders, steal the ball mid-dribble, block shots at the rim, or nail threes from downtown. Every match feels different because you're adapting to how your opponent plays rather than running set plays.",
        "controls": "Arrow keys move your player. X shoots or steals. Z passes or switches players in 2v2. S triggers a super shot when your meter is full. On offense you can pump fake before shooting, and on defense you can jump to contest shots or steal.",
        "controls2": "Matches are short—first to 11 points or whoever's ahead when time runs out. You can play quick matches, tournaments, or even practice to work on your timing. The physics feel just right—not too realistic but not cartoonish either.",
        "tips": "Learn the pump fake. Seriously. Hit the shoot button but don't hold it—your player pumps the ball, and if your defender jumps, you get a wide open shot when they land. This one move wins so many possessions once you get the timing down.",
        "tips2": "On defense, don't spam the steal button. You'll just foul or leave yourself out of position. Wait for your opponent to dribble and time your steal when the ball is furthest from their body. And on offense, use screens in 2v2 mode—they create easy baskets.",
        "features": ["Intense 1v1 and 2v2 basketball matches", "Tournament mode for progression", "Training mode to perfect your skills", "Realistic ball physics and player movement", "Super shot mechanic for comebacks", "Multiple courts and jerseys to unlock", "Both solo and multiplayer modes"]
    }
}

# Template for the CSS (same for all games)
description_styles = '''
        
        /* Description Section Styles */
        .description-container {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin-top: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .description-title {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 25px;
            text-align: center;
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }
        
        .description-section {
            margin-bottom: 25px;
        }
        
        .description-section:last-child {
            margin-bottom: 0;
        }
        
        .description-section h3 {
            font-size: 1.3rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .description-section p {
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.8;
            margin-bottom: 10px;
            font-size: 1.05rem;
        }
        
        .description-section strong {
            color: #ffffff;
            font-weight: 600;
        }
        
        .features-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .features-list li {
            color: rgba(255, 255, 255, 0.85);
            padding: 8px 0 8px 28px;
            position: relative;
            font-size: 1.05rem;
            line-height: 1.6;
        }
        
        .features-list li::before {
            content: "▸";
            position: absolute;
            left: 8px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 1.2rem;
        }
        
        @media (max-width: 768px) {
            .description-container {
                padding: 20px;
                margin-top: 20px;
            }
            
            .description-title {
                font-size: 1.6rem;
            }
            
            .description-section h3 {
                font-size: 1.1rem;
            }
            
            .description-section p,
            .features-list li {
                font-size: 0.95rem;
            }
        }'''

def generate_description_html(game_key, desc):
    """Generate the HTML for a game description"""
    features_html = '\n'.join([f'                    <li>{f}</li>' for f in desc['features']])
    
    return f'''        
        <!-- Game Description Section -->
        <div class="description-container">
            <h2 class="description-title">About {desc['title']}</h2>

            <div class="description-section">
                <h3>🎮 What Makes This Game Stand Out</h3>
                <p>{desc['hook']}</p>
                <p>{desc['hook2']}</p>
            </div>

            <div class="description-section">
                <h3>🎯 Controls & How to Play</h3>
                <p>{desc['controls']}</p>
                <p>{desc['controls2']}</p>
            </div>

            <div class="description-section">
                <h3>💡 Pro Tips</h3>
                <p>{desc['tips']}</p>
                <p>{desc['tips2']}</p>
            </div>

            <div class="description-section">
                <h3>✨ Key Features</h3>
                <ul class="features-list">
{features_html}
                </ul>
            </div>
        </div>'''

def add_descriptions_to_game(filepath, game_key):
    """Add description to a single game file"""
    if game_key not in game_descriptions:
        print(f"Skipping {game_key} - no description data")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has description
    if 'description-container' in content:
        print(f"Skipping {game_key} - already has description")
        return False
    
    desc_html = generate_description_html(game_key, game_descriptions[game_key])
    
    # Add CSS if not present
    if 'description-container' not in content:
        # Find the closing of the @media query
        content = re.sub(
            r'(\s+@media\s+\(max-width:\s*768px\)\s*\{[^}]+\}\s*\})',
            r'\1' + description_styles,
            content,
            count=1
        )
    
    # Add HTML description before closing </div></div> before scripts
    content = re.sub(
        r'(\s+</div>\s+</div>\s+<script>)',
        desc_html + r'\n    </div>\n\n    <script>',
        content,
        count=1
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Added description to {game_key}")
    return True

# Process games
base_path = r"c:\Users\thebb\Downloads\boyyyyyyyy-7.github.io-main (1)\boyyyyyyyy-7.github.io-main"

for game_key in game_descriptions.keys():
    filepath = os.path.join(base_path, f"{game_key}.html")
    if os.path.exists(filepath):
        add_descriptions_to_game(filepath, game_key)
    else:
        print(f"File not found: {filepath}")

print("\nDone!")
