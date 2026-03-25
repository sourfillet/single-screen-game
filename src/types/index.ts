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
    | "exit";
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
  mode?: 'hold' | 'toggle';
  requires?: string;
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
  switches?: SwitchDef[];
  switchDoors?: SwitchDoorDef[];
  pots?: PotDef[];
}
