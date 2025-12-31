
export type EntityType = 'PLAYER' | 'ENEMY' | 'ITEM' | 'EXIT';
export type TileType = 'FLOOR' | 'WALL';
export type DecorationType = 'MUSHROOM' | 'PUDDLE' | 'PEBBLE' | 'CRYSTAL';

export type AntType = 'SOLDIER' | 'SCOUT' | 'TANK' | 'WORKER';
export type BossType = 'RHINO' | 'QUEEN' | 'MANTIS';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
export type GameMode = 'CAMPAIGN' | 'ENDLESS';

export enum GameStatus {
  START = 'START', // Used for Menu
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY', // Level complete
  CAMPAIGN_WIN = 'CAMPAIGN_WIN' // Level 20 complete
}

export interface PlayerProfile {
  unlockedLevels: number;
  gold: number;
  selectedAnt: AntType;
  lastDifficulty?: Difficulty;
  hasSeenTutorial: boolean;
  sensitivity: number;
}

export interface AntStats {
  type: AntType;
  name: string;
  char: string;
  description: string;
  hpMod: number;
  speedMod: number;
  attackMod: number;
  staminaMod: number;
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  char: string; // Emoji or symbol
  color: string;
  name: string;
  hp?: number;
  maxHp?: number;
  stamina?: number;
  maxStamina?: number;
  attack?: number;
  value?: number; // For items/score
  angle?: number; // New: Angle in radians (0 = East, PI/2 = South)
  speed?: number;
  moveDebt?: number;
  attackCooldown?: number;
  isBoss?: boolean; // New: Boss flag for rendering and logic
  bossType?: BossType; // Specific boss behavior
}

export interface Tile {
  type: TileType;
  visible: boolean; // For fog of war
  seen: boolean;
  decoration?: DecorationType;
}

export interface GameState {
  map: Tile[][];
  width: number;
  height: number;
  entities: Entity[];
  player: Entity;
  level: number;
  turn: number;
  messageLog: string[];
  isGameOver: boolean;
  score: number;
  gold: number;
  difficulty: Difficulty;
  sensitivity: number;
  gameMode: GameMode;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  attack: boolean;
}
