export interface DPadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shield: boolean;
  colorCycle: boolean;
}

/**
 * Area-based definitions (obstacles, zones).
 * x, y = top-left corner in TILE units.
 * w, h = size in TILE units.
 * GameScene converts to pixel coords: centerPx = (x + w/2) * TILE_SIZE.
 */
export interface ObstacleDef {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: number;
  /** If true, a bomb explosion within blast radius destroys this obstacle. */
  breakable?: boolean;
  /** If true, fire can spread through this obstacle and ignite it. */
  flammable?: boolean;
}

/** See ObstacleDef for coordinate convention. */
export interface ZoneDef {
  type:
    | "damage"
    | "pit"
    | "ice"
    | "heal"
    | "directional"
    | "teleporter"
    | "exit"
    | "flammable";
  x: number;
  y: number;
  w: number;
  h: number;
  /** directional zones: which way to push entities */
  direction?: "up" | "down" | "left" | "right";
  /** directional zones: push speed in px/s */
  speed?: number;
  /** teleporter zones: zones sharing a group are linked */
  group?: string;
  /** teleporter zones: unique id used by other zones' destination field */
  id?: string;
  /**
   * teleporter zones: where to send the player.
   * A specific id → always sends there.
   * "random"       → picks randomly from the same group (excluding self).
   * Omitted        → cycles to the next zone in the group (original behaviour).
   */
  destination?: string;
  /** teleporter zones: false = receive-only (cannot send). Default true. */
  active?: boolean;
}

/**
 * Block definition — entity convention (same as EnemyDef / spawnX / spawnY).
 * x, y = tile column/row; the block occupies exactly 1 × 1 tile (32 × 32 px).
 * GameScene converts to pixel center: px = (x + 0.5) * TILE_SIZE.
 */
export interface BlockDef {
  x: number;
  y: number;
  pushable: boolean;
  transportable?: boolean;
  /** If true, a bomb blast destroys this block. */
  breakable?: boolean;
  /** If true, fire can spread to and burn this block. */
  flammable?: boolean;
}

/** See BlockDef for coordinate convention. */
export interface EnemyDef {
  x: number;
  y: number;
  /** Patrol waypoints in tile coords — same convention as x, y above. */
  path?: { x: number; y: number }[];
  /** Distance (px) at which the enemy wakes and chases the player. */
  wakeRadius?: number;
  /** Flying enemies ignore solid collisions and pit zones. Default: false. */
  flying?: boolean;
}

/**
 * Pickup definition — entity convention (same as BlockDef).
 * x, y = tile column/row; the pickup is centred within its tile.
 */
export interface PickupDef {
  /** Inventory key, e.g. `'key'`. */
  type: string;
  x: number;
  y: number;
}

/**
 * Locked block — entity convention (x, y = tile col/row, occupies 1×1 tile).
 * Acts like a fixed block; removed when the player bumps into it while carrying
 * the required item (default: 'key').
 */
export interface LockedBlockDef {
  x: number;
  y: number;
  requires: string;
}

/**
 * Locked door — area convention (same as ObstacleDef).
 * x, y = top-left tile corner; w, h = tile dimensions.
 * `requires` must match a PickupDef `type`.
 */
export interface LockedDoorDef {
  requires: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Switch — entity convention (x, y = tile col/row, occupies 1×1 tile).
 * `mode`:     'hold' | 'toggle'
 * `requires`: 'any' | 'block' | 'item:<type>'
 */
export interface SwitchDef {
  x: number;
  y: number;
  group: string;
  mode?: 'hold' | 'toggle' | 'one-time';
  requires?: string;
  /** false = permanently disabled at spawn; cannot be pressed. Default true. */
  enabled?: boolean;
}

/**
 * Switch-controlled door — area convention (x, y = top-left tile corner).
 * Opens/closes in response to linked Switch state.
 */
export interface SwitchDoorDef {
  x: number;
  y: number;
  w: number;
  h: number;
  group: string;
}

/**
 * Pot definition — entity convention (x, y = tile col/row, 1×1 tile).
 * Pots are always pickable and throwable; they break on thrown collision.
 */
export interface PotDef {
  x: number;
  y: number;
}

/**
 * Painted base tile — permanent cosmetic layer (entity convention: x,y = col,row).
 * Rendered above the default floor texture.
 */
export interface BaseTileDef {
  x: number;
  y: number;
  /** Tile palette key, e.g. 'tile_grass'. */
  texture: string;
}

/**
 * Top-layer tile — destructible by the player with a shovel (entity convention).
 * Rendered above base tiles. May hide a pickup underneath.
 */
export interface TopTileDef {
  x: number;
  y: number;
  texture: string;
  /** Pickup type spawned when this tile is dug up, e.g. 'key'. */
  hiddenPickup?: string;
}

export interface RoomDef {
  /** Room width in tiles. */
  width: number;
  /** Room height in tiles. */
  height: number;
  /** Player spawn point in tile coords (entity convention). Defaults to room centre. */
  spawnX?: number;
  spawnY?: number;
  obstacles?: ObstacleDef[];
  zones?: ZoneDef[];
  blocks?: BlockDef[];
  enemies?: EnemyDef[];
  pickups?: PickupDef[];
  lockedDoors?: LockedDoorDef[];
  lockedBlocks?: LockedBlockDef[];
  switches?: SwitchDef[];
  switchDoors?: SwitchDoorDef[];
  pots?: PotDef[];
  /** Permanent cosmetic tiles painted over the default floor. */
  baseTiles?: BaseTileDef[];
  /** Destructible top-layer tiles (requires shovel to dig). */
  topTiles?: TopTileDef[];
}
