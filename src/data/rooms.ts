import type { RoomDef } from '../types'

// Room definitions live here — easy to add more rooms later.
// Coordinates are in world pixels (origin = top-left of playfield, inside the walls).
export const ROOM_DEFS: Record<string, RoomDef> = {
  start: {
    width: 800,
    height: 600,
    obstacles: [
      { x: 200, y: 200, w: 64,  h: 64  },
      { x: 370, y: 150, w: 80,  h: 32  },
      { x: 560, y: 240, w: 32,  h: 96  },
      { x: 150, y: 400, w: 96,  h: 32  },
      { x: 600, y: 430, w: 64,  h: 64  },
      { x: 400, y: 380, w: 32,  h: 80  },
      { x: 300, y: 300, w: 48,  h: 48  },
    ],
  },
}
