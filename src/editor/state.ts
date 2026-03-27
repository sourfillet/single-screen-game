export interface BaseTileEntry { x: number; y: number; texture: string }
export interface TopTileEntry  { x: number; y: number; texture: string; hiddenPickup?: string }

/** Mutable room definition used during editing. */
export interface EditorRoom {
  width:   number
  height:  number
  spawnX:  number
  spawnY:  number
  blocks:       Record<string, unknown>[]
  pots:         Record<string, unknown>[]
  enemies:      Record<string, unknown>[]
  pickups:      Record<string, unknown>[]
  zones:        Record<string, unknown>[]
  obstacles:    Record<string, unknown>[]
  lockedDoors:  Record<string, unknown>[]
  lockedBlocks: Record<string, unknown>[]
  switches:     Record<string, unknown>[]
  switchDoors:  Record<string, unknown>[]
  baseTiles:    BaseTileEntry[]
  topTiles:     TopTileEntry[]
}

export const ARRAY_FIELDS = [
  'blocks', 'pots', 'enemies', 'pickups',
  'zones', 'obstacles', 'lockedDoors', 'lockedBlocks', 'switches', 'switchDoors',
] as const

export type ArrayField = typeof ARRAY_FIELDS[number]

export function emptyRoom(width = 25, height = 19): EditorRoom {
  return {
    width, height,
    spawnX: 1, spawnY: Math.floor(height / 2),
    blocks: [], pots: [], enemies: [], pickups: [],
    zones: [], obstacles: [], lockedDoors: [], lockedBlocks: [], switches: [], switchDoors: [],
    baseTiles: [], topTiles: [],
  }
}

export function paintTile(
  room: EditorRoom,
  layer: 'base' | 'top',
  col: number, row: number,
  texture: string,
  hiddenPickup?: string,
): void {
  const arr = layer === 'base' ? room.baseTiles : room.topTiles
  const idx = arr.findIndex(t => t.x === col && t.y === row)
  const entry: TopTileEntry = { x: col, y: row, texture }
  if (hiddenPickup) entry.hiddenPickup = hiddenPickup
  if (idx >= 0) arr[idx] = entry
  else arr.push(entry)
}

export function eraseTile(
  room: EditorRoom,
  layer: 'base' | 'top',
  col: number, row: number,
): void {
  const arr = layer === 'base' ? room.baseTiles : room.topTiles
  const idx = arr.findIndex(t => t.x === col && t.y === row)
  if (idx >= 0) arr.splice(idx, 1)
}

export function placeEntity(
  room: EditorRoom,
  field: string,
  col: number, row: number,
  props: Record<string, unknown>,
): void {
  if (field === '_spawn') { room.spawnX = col; room.spawnY = row; return }
  const arr = (room as unknown as Record<string, unknown[]>)[field]
  if (!Array.isArray(arr)) return
  arr.push({ ...props, x: col, y: row })
}

export function placeArea(
  room: EditorRoom,
  field: string,
  col: number, row: number, w: number, h: number,
  props: Record<string, unknown>,
): void {
  const arr = (room as unknown as Record<string, unknown[]>)[field]
  if (!Array.isArray(arr)) return
  arr.push({ ...props, x: col, y: row, w, h })
}

/** Remove entities occupying tile (col,row) and areas containing it. */
export function deleteAt(room: EditorRoom, col: number, row: number): boolean {
  let deleted = false
  const entityFields = ['blocks', 'pots', 'enemies', 'pickups', 'switches', 'lockedBlocks']
  const areaFields   = ['zones', 'obstacles', 'lockedDoors', 'switchDoors']

  for (const f of entityFields) {
    const arr = (room as unknown as Record<string, Record<string,unknown>[]>)[f]
    const before = arr.length
    ;(room as unknown as Record<string, unknown[]>)[f] = arr.filter(it => !(it['x'] === col && it['y'] === row))
    if ((room as unknown as Record<string, unknown[]>)[f].length !== before) deleted = true
  }
  for (const f of areaFields) {
    const arr = (room as unknown as Record<string, Record<string,unknown>[]>)[f]
    const before = arr.length
    ;(room as unknown as Record<string, unknown[]>)[f] = arr.filter(it => {
      const inX = col >= (it['x'] as number) && col < (it['x'] as number) + (it['w'] as number)
      const inY = row >= (it['y'] as number) && row < (it['y'] as number) + (it['h'] as number)
      return !(inX && inY)
    })
    if ((room as unknown as Record<string, unknown[]>)[f].length !== before) deleted = true
  }
  return deleted
}

/** Patch properties on an existing item in-place. */
export function updateItem(
  room: EditorRoom,
  field: string,
  index: number,
  patch: Record<string, unknown>,
): void {
  const arr = (room as unknown as Record<string, Record<string, unknown>[]>)[field]
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) return
  Object.assign(arr[index], patch)
}

export function exportJSON(room: EditorRoom): string {
  const out: Record<string, unknown> = {
    width:  room.width,
    height: room.height,
    spawnX: room.spawnX,
    spawnY: room.spawnY,
  }
  for (const f of ARRAY_FIELDS) {
    if (room[f].length > 0) out[f] = room[f]
  }
  if (room.baseTiles.length > 0) out['baseTiles'] = room.baseTiles
  if (room.topTiles.length  > 0) out['topTiles']  = room.topTiles
  return JSON.stringify(out, null, 2)
}

export function importJSON(json: string): EditorRoom {
  const p = JSON.parse(json) as Record<string, unknown>
  const room = emptyRoom(Number(p['width'] ?? 25), Number(p['height'] ?? 19))
  room.spawnX = Number(p['spawnX'] ?? 1)
  room.spawnY = Number(p['spawnY'] ?? Math.floor(room.height / 2))
  for (const f of ARRAY_FIELDS) {
    const val = p[f]
    if (Array.isArray(val)) room[f] = val as Record<string, unknown>[]
  }
  if (Array.isArray(p['baseTiles'])) room.baseTiles = p['baseTiles'] as BaseTileEntry[]
  if (Array.isArray(p['topTiles']))  room.topTiles  = p['topTiles']  as TopTileEntry[]
  return room
}
