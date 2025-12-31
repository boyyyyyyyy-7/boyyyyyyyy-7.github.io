
import { GameState, Position, Tile, Entity, TileType, InputState, AntType, AntStats, BossType, Difficulty, GameMode } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { audioService } from './audioService';

// --- CONSTANTS ---
// Increased map size for bigger levels
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;
const FLASHLIGHT_RADIUS = 8.5; 

// Base Stats
const BASE_SPEED = 0.06; 
const TURN_SPEED = 0.05; 
const SPRINT_MULTIPLIER = 1.8;
const ATTACK_COOLDOWN_FRAMES = 60; 

export const DIFFICULTY_CONFIG: Record<Difficulty, { enemyHp: number, enemyDmg: number, enemyCount: number, score: number, playerHp: number }> = {
  EASY: { enemyHp: 0.7, enemyDmg: 0.7, enemyCount: 0.8, score: 0.5, playerHp: 1.3 },
  NORMAL: { enemyHp: 1.0, enemyDmg: 1.0, enemyCount: 1.0, score: 1.0, playerHp: 1.0 },
  HARD: { enemyHp: 1.4, enemyDmg: 1.4, enemyCount: 1.3, score: 1.5, playerHp: 0.8 },
};

export const ANT_CONFIGS: Record<AntType, AntStats> = {
  SOLDIER: {
    type: 'SOLDIER',
    name: 'Soldier',
    char: '🐜',
    color: 'text-orange-600',
    description: 'Balanced warrior. Hardened shell.',
    hpMod: 1.0, // 150
    speedMod: 1.0,
    attackMod: 1.0, // 12
    staminaMod: 1.0
  },
  SCOUT: {
    type: 'SCOUT',
    name: 'Scout',
    char: '🦗',
    color: 'text-yellow-400',
    description: 'Fast and agile. Weak combatant.',
    hpMod: 0.6, // 90
    speedMod: 1.4, // Fast
    attackMod: 0.7, // 8
    staminaMod: 1.5 // More stamina
  },
  TANK: {
    type: 'TANK',
    name: 'Praetorian',
    char: '🪲',
    color: 'text-blue-800',
    description: 'Massive HP. Slow movement.',
    hpMod: 1.8, // 270
    speedMod: 0.8, // Slow
    attackMod: 1.2, // 14
    staminaMod: 0.8
  },
  WORKER: {
    type: 'WORKER',
    name: 'Harvester',
    char: '🐜',
    color: 'text-amber-700',
    description: 'Efficient gatherer. Starts with bonus gold.',
    hpMod: 0.8, // 120
    speedMod: 1.0,
    attackMod: 0.9, 
    staminaMod: 1.0
  }
};

const ENEMIES_TEMPLATE = [
  { name: "Void Weaver", char: "🕷️", color: "text-gray-900", hp: 8, attack: 3, score: 50, speed: 0.045 }, 
  { name: "Spine Crawler", char: "🐛", color: "text-red-700", hp: 25, attack: 2, score: 80, speed: 0.03 }, 
  { name: "Blood Beetle", char: "🪲", color: "text-red-900", hp: 45, attack: 6, score: 150, speed: 0.02 }, 
  { name: "Acid Spitter", char: "🐜", color: "text-green-900", hp: 15, attack: 5, score: 100, speed: 0.05 },
  { name: "Stick Mantis", char: "🎋", color: "text-lime-800", hp: 35, attack: 9, score: 130, speed: 0.035 }, 
];

const ITEMS_TEMPLATE = [
  { name: "Royal Jelly", char: "🍯", color: "text-yellow-400", value: 100, type: 'HEAL' }, 
  { name: "Sugar Crystal", char: "🧊", color: "text-white", value: 50, type: 'GOLD' },
  { name: "Dew Drop", char: "💧", color: "text-blue-400", value: 50, type: 'HEAL' }, 
  { name: "Ancient Pheromone", char: "🏺", color: "text-purple-500", value: 250, type: 'GOLD' },
  { name: "Energy Nectar", char: "⚡", color: "text-yellow-300", value: 50, type: 'STAMINA' }, 
];

// --- HELPER FUNCTIONS ---

const getDist = (a: Position, b: Position) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const isBlocked = (state: GameState, x: number, y: number) => {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return true;
  const gridX = Math.floor(x);
  const gridY = Math.floor(y);
  if (gridX < 0 || gridX >= state.width || gridY < 0 || gridY >= state.height) return true;
  if (state.map[gridY][gridX].type === 'WALL') return true;
  return false;
};

// --- MAP GENERATION ---

function generateMap(level: number, antConfig: AntStats, difficulty: Difficulty, gameMode: GameMode): GameState {
  const diffConfig = DIFFICULTY_CONFIG[difficulty];
  
  const map: Tile[][] = Array(MAP_HEIGHT).fill(null).map(() => 
    Array(MAP_WIDTH).fill(null).map(() => ({ type: 'WALL', visible: false, seen: false }))
  );

  let floors = 0;
  let cursor = { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) };
  const targetFloors = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.45); 

  map[cursor.y][cursor.x].type = 'FLOOR';

  let life = 0;
  // Increased walker life span to create longer tunnels for bigger map
  const maxLife = 40; 

  while (floors < targetFloors) {
    const dir = randomInt(0, 5); 
    let dx = 0, dy = 0;
    
    if (dir <= 1) dy = -1;
    else if (dir <= 2) dy = 1;
    else if (dir <= 3) dx = -1;
    else dx = 1;

    const nx = Math.max(1, Math.min(MAP_WIDTH - 2, cursor.x + dx));
    const ny = Math.max(1, Math.min(MAP_HEIGHT - 2, cursor.y + dy));
    
    cursor = { x: nx, y: ny };
    if (map[ny][nx].type === 'WALL') {
      map[ny][nx].type = 'FLOOR';
      floors++;
    }
    
    life++;
    if (life > maxLife) {
      life = 0;
      let found = false;
      while(!found) {
        const ry = randomInt(1, MAP_HEIGHT-2);
        const rx = randomInt(1, MAP_WIDTH-2);
        if (map[ry][rx].type === 'FLOOR') {
          cursor = { x: rx, y: ry };
          found = true;
        }
      }
    }
  }

  // Add Decorations
  map.forEach((row, y) => {
    row.forEach((tile, x) => {
        if (tile.type === 'FLOOR') {
            if (Math.random() < 0.12) { 
                const rand = Math.random();
                if (rand < 0.35) tile.decoration = 'MUSHROOM';
                else if (rand < 0.65) tile.decoration = 'PEBBLE';
                else if (rand < 0.85) tile.decoration = 'PUDDLE';
                else tile.decoration = 'CRYSTAL';
            }
        }
    });
  });

  const floorTiles: Position[] = [];
  map.forEach((row, y) => row.forEach((tile, x) => {
    if (tile.type === 'FLOOR') floorTiles.push({ x, y });
  }));

  for (let i = floorTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
  }

  const startTile = floorTiles.pop()!;
  const startPos = { x: startTile.x + 0.5, y: startTile.y + 0.5 };
  
  // Find a suitable exit tile far away from start
  let bestExitIndex = floorTiles.length - 1;
  let maxDist = -1;
  const MIN_EXIT_DISTANCE = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.6; // Ensure it's reasonably far

  for (let i = floorTiles.length - 1; i >= 0; i--) {
    const t = floorTiles[i];
    const dist = Math.sqrt(Math.pow(t.x - startTile.x, 2) + Math.pow(t.y - startTile.y, 2));
    
    if (dist > maxDist) {
        maxDist = dist;
        bestExitIndex = i;
    }
    // If we find one that is far enough, take it.
    if (dist >= MIN_EXIT_DISTANCE) {
        bestExitIndex = i;
        break;
    }
  }

  const exitTile = floorTiles.splice(bestExitIndex, 1)[0];
  const exitPos = { x: exitTile.x + 0.5, y: exitTile.y + 0.5 };

  const entities: Entity[] = [];

  entities.push({
    id: 'exit',
    type: 'EXIT',
    pos: exitPos,
    char: '🔆',
    color: 'text-yellow-300',
    name: 'Tunnel Up'
  });

  const isBossLevel = level % 5 === 0;

  // BOSS SPAWN
  if (isBossLevel) {
    let bossTileIndex = -1;
    // Keep bosses at a safer distance to avoid instant aggro
    const MIN_BOSS_DIST = 10;
    
    // Find a valid tile for the boss
    for (let j = floorTiles.length - 1; j >= 0; j--) {
        const candidate = floorTiles[j];
        const d = Math.sqrt(Math.pow(candidate.x - startTile.x, 2) + Math.pow(candidate.y - startTile.y, 2));
        if (d > MIN_BOSS_DIST) {
             bossTileIndex = j;
             break;
        }
    }
    
    const bossTile = bossTileIndex >= 0 ? floorTiles.splice(bossTileIndex, 1)[0] : floorTiles.pop()!;
    const bossPos = { x: bossTile.x + 0.5, y: bossTile.y + 0.5 };
    
    let bossType: BossType = 'RHINO';
    let bossName = "Ironclad Rhino";
    let bossHp = 300;
    let bossSpeed = 0.025;
    let bossAttack = 15;
    let bossChar = "🪲";
    let bossColor = "text-gray-400";

    const cycle = level % 15;
    
    if (cycle === 5) { // 5, 20, 35...
        bossType = 'RHINO';
        bossName = "Ironclad Rhino";
        bossChar = "🪲";
        bossColor = "text-gray-400";
        bossHp = 400 + (level * 15); // Reduced scaling (was 25)
        bossSpeed = 0.025; // Slow tank
        bossAttack = 18 + level;
    } else if (cycle === 10) { // 10, 25, 40...
        bossType = 'QUEEN';
        bossName = "Brood Queen";
        bossChar = "👑";
        bossColor = "text-yellow-600";
        bossHp = 250 + (level * 10); // Reduced scaling (was 15)
        bossSpeed = 0.035; // Moderate
        bossAttack = 12 + level;
    } else { // 0 (15, 30, 45...)
        bossType = 'MANTIS';
        bossName = "Scythe King";
        bossChar = "🦗";
        bossColor = "text-green-500";
        bossHp = 200 + (level * 8); // Reduced scaling (was 12)
        bossSpeed = 0.06; // Fast assassin
        bossAttack = 22 + level;
    }

    // Apply difficulty modifiers to boss
    bossHp = Math.floor(bossHp * diffConfig.enemyHp);
    bossAttack = Math.floor(bossAttack * diffConfig.enemyDmg);

    entities.push({
        id: uuidv4(),
        type: 'ENEMY',
        pos: bossPos,
        char: bossChar,
        color: bossColor,
        name: bossName,
        hp: bossHp,
        maxHp: bossHp,
        attack: bossAttack,
        speed: bossSpeed,
        moveDebt: 0,
        value: Math.floor(5000 * level * diffConfig.score),
        isBoss: true,
        bossType: bossType,
        attackCooldown: 0
    });
  }

  // Calculate enemy count based on difficulty
  // REBALANCED: Reduced slope (0.6 instead of 1.5) and added cap of 25 base enemies.
  const baseEnemyCount = Math.min(25, 3 + Math.floor(level * 0.6)) * (isBossLevel ? 0.5 : 1); 
  const enemyCount = Math.floor(baseEnemyCount * diffConfig.enemyCount);
  const itemCount = 7 + Math.floor(Math.random() * 5);

  for (let i = 0; i < enemyCount; i++) {
    if (floorTiles.length === 0) break;
    
    let tIndex = -1;
    // Minimum safe distance to prevent instant aggro or crowding spawn (7 tiles ~ breathing room)
    const safeDist = 7; 
    
    // Scan for a valid spawn point
    for (let j = floorTiles.length - 1; j >= 0; j--) {
        const candidate = floorTiles[j];
        const dist = Math.sqrt(Math.pow(candidate.x - startTile.x, 2) + Math.pow(candidate.y - startTile.y, 2));
        if (dist > safeDist) {
            tIndex = j;
            break;
        }
    }
    
    const t = tIndex >= 0 ? floorTiles.splice(tIndex, 1)[0] : floorTiles.pop()!;
    const pos = { x: t.x + 0.5, y: t.y + 0.5 };
    
    const tier = Math.min(ENEMIES_TEMPLATE.length - 1, Math.floor((level - 1) / 3));
    const actualTier = Math.random() > 0.8 ? Math.min(ENEMIES_TEMPLATE.length - 1, tier + 1) : tier;
    const template = ENEMIES_TEMPLATE[actualTier] || ENEMIES_TEMPLATE[0];
    
    // Apply Difficulty Modifiers
    // REBALANCED: Slower HP scaling (1.5x level instead of 2x)
    const hp = Math.floor((template.hp + (level * 1.5)) * diffConfig.enemyHp);
    // REBALANCED: Slower Attack scaling (0.25x level instead of 0.5x)
    const attack = Math.floor((template.attack + Math.floor(level * 0.25)) * diffConfig.enemyDmg);
    
    // REBALANCED: Cap speed increase to +0.04 total
    const speedBoost = Math.min(0.04, level * 0.0015);
    const speed = template.speed + speedBoost;

    entities.push({
      id: uuidv4(),
      type: 'ENEMY',
      pos,
      char: template.char,
      color: template.color,
      name: template.name,
      hp: hp,
      maxHp: hp,
      attack: attack,
      speed: speed,
      moveDebt: 0,
      value: Math.floor(template.score * level * diffConfig.score),
      attackCooldown: 0
    });
  }

  for (let i = 0; i < itemCount; i++) {
    if (floorTiles.length === 0) break;
    const t = floorTiles.pop()!;
    const pos = { x: t.x + 0.5, y: t.y + 0.5 };
    
    const template = ITEMS_TEMPLATE[randomInt(0, ITEMS_TEMPLATE.length - 1)];
    entities.push({
      id: uuidv4(),
      type: 'ITEM',
      pos,
      char: template.char,
      color: template.color,
      name: template.name,
      value: template.value 
    });
  }

  // PLAYER SCALING: Player now gets stronger with depth
  const basePlayerHp = (150 * antConfig.hpMod) + (level * 5);
  const playerHp = Math.floor(basePlayerHp * diffConfig.playerHp);
  const playerAttack = Math.floor((12 * antConfig.attackMod) + (level * 0.5));

  const player: Entity = {
    id: 'player',
    type: 'PLAYER',
    pos: startPos,
    char: antConfig.char,
    color: antConfig.color,
    name: antConfig.name,
    hp: playerHp, 
    maxHp: playerHp,
    stamina: Math.floor(100 * antConfig.staminaMod),
    maxStamina: Math.floor(100 * antConfig.staminaMod),
    attack: playerAttack, 
    angle: -Math.PI / 2, 
    attackCooldown: 0,
    speed: BASE_SPEED * antConfig.speedMod
  };

  // Messages logic
  let msgs: string[] = [];
  if (gameMode === 'ENDLESS') {
    msgs = level === 1 
      ? ["SURVIVAL MODE", "Survive as long as possible."]
      : isBossLevel ? ["WARNING: ALPHA DETECTED!", "The swarm grows stronger."] 
      : [`WAVE ${level}: Survival continues.`];
  } else {
    // Campaign Mode - Countdown Depth
    const depth = 21 - level;
    msgs = level === 1 
      ? [`DISTANCE: ${depth}`, "Signal Lost. Locate the surface."]
      : isBossLevel ? ["WARNING: GUARDIAN DETECTED!", "The path is blocked."] 
      : [`DISTANCE: ${depth}: Climbing higher.`];
  }

  return {
    map,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    entities,
    player,
    level,
    turn: 0,
    messageLog: msgs,
    isGameOver: false,
    score: 0,
    gold: antConfig.type === 'WORKER' ? 200 : 0,
    difficulty: difficulty,
    sensitivity: 1.0, // Overwritten by init args
    gameMode: gameMode
  };
}

// --- GAME LOGIC ---

export const initGame = (level: number = 1, antType: AntType = 'SOLDIER', difficulty: Difficulty = 'NORMAL', sensitivity: number = 1.0, gameMode: GameMode = 'CAMPAIGN'): GameState => {
  const config = ANT_CONFIGS[antType];
  const state = generateMap(level, config, difficulty, gameMode);
  state.sensitivity = sensitivity;
  updateVisibility(state);
  return state;
};

export const processTurn = (state: GameState, input: InputState): GameState => {
  if (state.isGameOver) return state;

  const newState = { ...state, messageLog: [...state.messageLog], player: { ...state.player } };
  newState.entities = state.entities.map(e => ({...e}));

  if (newState.messageLog.length > 5) newState.messageLog.shift();

  // --- PLAYER MOVEMENT (TANK CONTROLS) ---
  const currentTurnSpeed = TURN_SPEED * (state.sensitivity || 1.0);
  
  // Turning
  if (input.left) newState.player.angle = (newState.player.angle || 0) - currentTurnSpeed;
  if (input.right) newState.player.angle = (newState.player.angle || 0) + currentTurnSpeed;

  // Speed Calc
  const baseSpeed = newState.player.speed || BASE_SPEED;
  let currentSpeed = 0;
  if (input.forward) currentSpeed = baseSpeed;
  if (input.backward) currentSpeed = -baseSpeed * 0.6; 

  // Sprinting
  const isSprinting = input.sprint && input.forward && (newState.player.stamina || 0) > 0;
  if (isSprinting) {
    currentSpeed *= SPRINT_MULTIPLIER;
    newState.player.stamina = Math.max(0, (newState.player.stamina || 0) - 0.5); 
  } else {
    newState.player.stamina = Math.min(newState.player.maxStamina || 100, (newState.player.stamina || 0) + 0.1); 
  }

  // Apply Movement
  if (currentSpeed !== 0) {
    const angle = newState.player.angle || 0;
    const dx = Math.cos(angle) * currentSpeed; 
    const dy = Math.sin(angle) * currentSpeed; 

    const newX = newState.player.pos.x + dx;
    const newY = newState.player.pos.y + dy;

    let moved = false;
    // Check X
    if (!isBlocked(newState, newX, newState.player.pos.y)) {
      newState.player.pos.x = newX;
      moved = true;
    }
    // Check Y
    if (!isBlocked(newState, newState.player.pos.x, newY)) {
      newState.player.pos.y = newY;
      moved = true;
    }
    
    if (moved) {
        audioService.playWalk(isSprinting);
    }
  }

  // --- INTERACTION / ATTACK ---
  // Cooldown
  if ((newState.player.attackCooldown || 0) > 0) newState.player.attackCooldown = (newState.player.attackCooldown || 0) - 1;

  for (let i = newState.entities.length - 1; i >= 0; i--) {
    const e = newState.entities[i];
    const d = getDist(newState.player.pos, e.pos);
    
    // ITEM PICKUP
    if (e.type === 'ITEM' && d < 0.6) {
        if (e.name.includes("Jelly") || e.name.includes("Dew")) {
            const heal = e.value || 50;
            newState.player.hp = Math.min(newState.player.maxHp || 150, (newState.player.hp || 0) + heal);
            newState.messageLog.push(`Consumed ${e.name} (+${heal} HP).`);
            audioService.playPickup('HEAL');
        } else if (e.name.includes("Nectar")) {
            newState.player.stamina = Math.min(newState.player.maxStamina || 100, (newState.player.stamina || 0) + 50);
            newState.messageLog.push(`Drank Nectar.`);
            audioService.playPickup('STAMINA');
        } else {
            newState.gold += e.value || 0;
            newState.score += e.value || 0;
            newState.messageLog.push(`Got ${e.name}.`);
            audioService.playPickup('GOLD');
        }
        newState.entities.splice(i, 1);
        continue;
    }

    // EXIT
    if (e.type === 'EXIT' && d < 0.8) {
        // VICTORY CONDITION
        newState.isGameOver = true;
        audioService.playLevelComplete();
        return newState; 
    }

    // ENEMY COMBAT (Player Attack - Manual Only)
    if (input.attack && e.type === 'ENEMY' && d < 1.3) {
       if ((newState.player.attackCooldown || 0) <= 0) {
           newState.player.attackCooldown = 25; 
           audioService.playAttack();
           
           const damage = newState.player.attack || 12;
           e.hp = (e.hp || 0) - damage;
           
           // Push enemy back
           const pushDirX = e.pos.x - newState.player.pos.x;
           const pushDirY = e.pos.y - newState.player.pos.y;
           const len = Math.sqrt(pushDirX*pushDirX + pushDirY*pushDirY) || 1;
           const newEX = e.pos.x + (pushDirX/len) * 0.5;
           const newEY = e.pos.y + (pushDirY/len) * 0.5;
           
           // Bosses have knockback resistance (only move a tiny bit)
           const knockbackScale = e.isBoss ? 0.1 : 0.5;
           
           if(!isBlocked(newState, e.pos.x + (pushDirX/len) * knockbackScale, e.pos.y + (pushDirY/len) * knockbackScale)) {
               e.pos.x = e.pos.x + (pushDirX/len) * knockbackScale;
               e.pos.y = e.pos.y + (pushDirY/len) * knockbackScale;
           }

           newState.messageLog.push(`Bit ${e.name}! ${damage} dmg.`);

           if (e.hp <= 0) {
               audioService.playEnemyDeath();
               newState.messageLog.push(`${e.name} crushed!`);
               newState.score += e.value || 0;
               // Heal on kill
               newState.player.hp = Math.min(newState.player.maxHp!, newState.player.hp! + 10);
               newState.entities.splice(i, 1);
           }
       }
    }
  }

  // --- ENEMY AI (Real Time) ---
  newState.entities.forEach(e => {
    if (e.type === 'ENEMY') {
        // Cooldown
        if ((e.attackCooldown || 0) > 0) e.attackCooldown = (e.attackCooldown || 0) - 1;

        const dist = getDist(e.pos, newState.player.pos);
        
        // SPECIAL BOSS AI: QUEEN SUMMONING
        if (e.isBoss && e.bossType === 'QUEEN' && dist < 10) {
            // 0.5% chance per frame to summon minion if player is near
            if (Math.random() < 0.005) {
                // Find open spot
                const angle = Math.random() * Math.PI * 2;
                const sx = e.pos.x + Math.cos(angle);
                const sy = e.pos.y + Math.sin(angle);
                if (!isBlocked(newState, sx, sy)) {
                    // Minion stats based on difficulty (hardcoded relative weakness)
                    const diff = DIFFICULTY_CONFIG[newState.difficulty];
                    const hp = Math.floor(15 * diff.enemyHp);
                    const atk = Math.floor(5 * diff.enemyDmg);

                    newState.entities.push({
                        id: uuidv4(),
                        type: 'ENEMY',
                        pos: {x: sx, y: sy},
                        char: "🕷️",
                        color: "text-gray-900",
                        name: "Queen's Guard",
                        hp: hp,
                        maxHp: hp,
                        attack: atk,
                        speed: 0.05,
                        value: Math.floor(10 * diff.score),
                        attackCooldown: 20
                    });
                    newState.messageLog.push("The Queen summons a guard!");
                }
            }
        }

        // Aggro range (Bosses see further)
        const aggroRange = e.isBoss ? 12 : 6.5;

        if (dist < aggroRange) {
            // Move towards player
            if (dist > 0.8) {
                const moveX = newState.player.pos.x - e.pos.x;
                const moveY = newState.player.pos.y - e.pos.y;
                const length = Math.sqrt(moveX*moveX + moveY*moveY) || 1;
                
                const speed = e.speed || 0.05;
                const vx = (moveX / length) * speed;
                const vy = (moveY / length) * speed;
                
                // Try move X
                if (!isBlocked(newState, e.pos.x + vx, e.pos.y)) {
                    e.pos.x += vx;
                }
                // Try move Y
                if (!isBlocked(newState, e.pos.x, e.pos.y + vy)) {
                    e.pos.y += vy;
                }
            } else {
                // Attack Player
                if ((e.attackCooldown || 0) <= 0) {
                    audioService.playDamage();
                    const dmg = e.attack || 2;
                    newState.player.hp = (newState.player.hp || 150) - dmg;
                    e.attackCooldown = ATTACK_COOLDOWN_FRAMES;
                    newState.messageLog.push(`${e.name} hit you! -${dmg}`);
                }
            }
        }
    }
  });

  if ((newState.player.hp || 0) <= 0) {
    newState.isGameOver = true;
    newState.messageLog.push("OVERWHELMED BY THE SWARM.");
    audioService.playGameOver();
  }

  updateVisibility(newState);
  newState.turn++; 
  return newState;
};

function updateVisibility(state: GameState) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      state.map[y][x].visible = false;
    }
  }

  const pX = state.player.pos.x;
  const pY = state.player.pos.y;
  const angle = state.player.angle || 0;
  
  const fX = Math.cos(angle);
  const fY = Math.sin(angle);

  const startX = Math.max(0, Math.floor(pX - FLASHLIGHT_RADIUS));
  const endX = Math.min(state.width, Math.ceil(pX + FLASHLIGHT_RADIUS));
  const startY = Math.max(0, Math.floor(pY - FLASHLIGHT_RADIUS));
  const endY = Math.min(state.height, Math.ceil(pY + FLASHLIGHT_RADIUS));

  for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
          const tileCenterX = x + 0.5;
          const tileCenterY = y + 0.5;
          
          const dx = tileCenterX - pX;
          const dy = tileCenterY - pY;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist <= FLASHLIGHT_RADIUS) {
              const ndx = dx / dist;
              const ndy = dy / dist;
              
              const dot = ndx * fX + ndy * fY;
              if (dist < 1.2 || dot > 0.5) {
                state.map[y][x].visible = true;
                state.map[y][x].seen = true;
              }
          }
      }
  }
}
