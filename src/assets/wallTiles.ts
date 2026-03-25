import wallTilesetUrl from '../tiles/wall-2.bmp'

// Tiles are 32×32 px — same as TILE_SIZE — no upscaling needed.
export const WALL_KEY   = 'walls'
export const WALL_SCALE = 1

// ── Spritesheet layout: 5 columns × 2 rows of 32×32 ───────────────────────
//
//  Row 0 (upper — raised room walls):
//   0  U_NW_CORNER     NW corner
//   1  U_NW_NEXT       NW next-to-corner  (horizontal)
//   2  U_NW_WALL       NW wall body       (horizontal, repeating)
//   3  U_NW_NEXT_MID   NW next-to-middle  (horizontal)
//   4  U_N_WALL        N wall             (symmetric, safe to rotate)
//
//  Row 1 (upper-WN + lower — pit / drop-edge):
//   5  U_WN_NEXT       WN next-to-corner  (pre-rotated for west wall)
//   6  L_NW_CORNER     lower NW corner
//   7  L_NW_NEXT       lower NW next-to-corner
//   8  L_NW_NEXT_MID   lower NW next-to-middle
//   9  L_N_WALL        lower N wall       (symmetric)
//
// Corners / mirrored sides are derived from these via flipX / flipY / setAngle.

export const WALL_FRAMES = {
  // Upper (room walls)
  U_NW_CORNER:   0,
  U_NW_NEXT:     1,
  U_NW_WALL:     2,
  U_NW_NEXT_MID: 3,
  U_N_WALL:      4,
  // Upper west-wall (pre-rotated — no angle needed for west placement)
  U_WN_NEXT:     5,
  // Lower (pit / drop edges)
  L_NW_CORNER:   6,
  L_NW_NEXT:     7,
  L_NW_NEXT_MID: 8,
  L_N_WALL:      9,
} as const

export const WALL_TILE_URL = wallTilesetUrl
