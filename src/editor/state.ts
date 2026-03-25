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
  switches:     Record<string, unknown>[]
  switchDoors:  Record<string, unknown>[]
}

export const ARRAY_FIELDS = [
  'blocks', 'pots', 'enemies', 'pickups',
  'zones', 'obstacles', 'lockedDoors', 'switches', 'switchDoors',
] as const

export type ArrayField = typeof ARRAY_FIELDS[number]

export function emptyRoom(width = 25, height = 19): EditorRoom {
  return {
    width, height,
    spawnX: 1, spawnY: Math.floor(height / 2),
    blocks: [], pots: [], enemies: [], pickups: [],
    zones: [], obstacles: [], lockedDoors: [], switches: [], switchDoors: [],
  }
}

export function placeEntity(
  room: EditorRoom,
  field: string,
  col: number, row: number,
  props: Record<string, unknown>,
): void {
  if (field === '_spawn') { room.spawnX = col; room.spawnY = row; return }
  const arr = (room as Record<string, unknown[]>)[field]
  if (!Array.isArray(arr)) return
  arr.push({ ...props, x: col, y: row })
}

export function placeArea(
  room: EditorRoom,
  field: string,
  col: number, row: number, w: number, h: number,
  props: Record<string, unknown>,
): void {
  const arr = (room as Record<string, unknown[]>)[field]
  if (!Array.isArray(arr)) return
  arr.push({ ...props, x: col, y: row, w, h })
}

/** Remove entities occupying tile (col,row) and areas containing it. */
export function deleteAt(room: EditorRoom, col: number, row: number): boolean {
  let deleted = false
  const entityFields = ['blocks', 'pots', 'enemies', 'pickups', 'switches']
  const areaFields   = ['zones', 'obstacles', 'lockedDoors', 'switchDoors']

  for (const f of entityFields) {
    const arr = (room as Record<string, Record<string,unknown>[]>)[f]
    const before = arr.length
    ;(room as Record<string, unknown[]>)[f] = arr.filter(it => !(it['x'] === col && it['y'] === row))
    if ((room as Record<string, unknown[]>)[f].length !== before) deleted = true
  }
  for (const f of areaFields) {
    const arr = (room as Record<string, Record<string,unknown>[]>)[f]
    const before = arr.length
    ;(room as Record<string, unknown[]>)[f] = arr.filter(it => {
      const inX = col >= (it['x'] as number) && col < (it['x'] as number) + (it['w'] as number)
      const inY = row >= (it['y'] as number) && row < (it['y'] as number) + (it['h'] as number)
      return !(inX && inY)
    })
    if ((room as Record<string, unknown[]>)[f].length !== before) deleted = true
  }
  return deleted
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
  return room
}
