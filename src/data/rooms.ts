import type { RoomDef } from "../types";
import startRoom from "./rooms/start.json";
import testRoom from "./rooms/testlevel.json";
import testMaze from "./rooms/textmaze.json";

/**
 * One tile = 32 px, matching the rendered sprite size (16 px source × scale 2).
 * This means one tile = one sprite-width, so positions read as "sprite units".
 */
export const TILE_SIZE = 32;

// Coordinate conventions (see src/types/index.ts for full documentation):
//   Areas  (obstacles, zones, blocks) — x,y = top-left tile corner; w,h = tile dimensions.
//   Entities (enemies, spawnX/Y)      — x,y = tile column/row of the entity's cell.
//
// To add a room: drop a new JSON file in src/data/rooms/ and add it below.

export const ROOM_DEFS: Record<string, RoomDef> = {
  //start: startRoom as RoomDef,
  test:     testRoom as RoomDef,
  textmaze: testMaze as RoomDef,
};
