export interface PropDef {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select'
  options?: string[]
  default: string | number | boolean
}

export type PlacementMode = 'entity' | 'area'

export interface ToolDef {
  id: string
  label: string
  category: string
  mode: PlacementMode
  /** Which array in RoomDef this populates. '_spawn' is special (sets spawnX/spawnY). */
  field: string
  /** CSS hex color used for editor preview */
  color: string
  /** Merged into every placed item without appearing in the UI */
  staticProps?: Record<string, unknown>
  /** Editable per-item properties shown in the sidebar */
  props: PropDef[]
}

export const TOOLS: ToolDef[] = [
  // ── Spawn ────────────────────────────────────────────────────────────────
  {
    id: 'spawn', label: 'Spawn Point', category: 'Spawn',
    mode: 'entity', field: '_spawn', color: '#00ff66',
    staticProps: {}, props: [],
  },

  // ── Blocks ───────────────────────────────────────────────────────────────
  {
    id: 'block-fixed', label: 'Block (Fixed)', category: 'Blocks',
    mode: 'entity', field: 'blocks', color: '#7a4010',
    staticProps: { pushable: false }, props: [],
  },
  {
    id: 'block-pushable', label: 'Block (Pushable)', category: 'Blocks',
    mode: 'entity', field: 'blocks', color: '#b06020',
    staticProps: { pushable: true }, props: [],
  },
  {
    id: 'block-carryable', label: 'Block (Carryable)', category: 'Blocks',
    mode: 'entity', field: 'blocks', color: '#d08030',
    staticProps: { pushable: true, transportable: true }, props: [],
  },

  // ── Objects ──────────────────────────────────────────────────────────────
  {
    id: 'pot', label: 'Pot', category: 'Objects',
    mode: 'entity', field: 'pots', color: '#9090b0',
    staticProps: {}, props: [],
  },

  // ── Enemies ──────────────────────────────────────────────────────────────
  {
    id: 'enemy', label: 'Enemy', category: 'Enemies',
    mode: 'entity', field: 'enemies', color: '#dd2222',
    staticProps: {},
    props: [
      { key: 'wakeRadius', label: 'Wake radius', type: 'number', default: 160 },
      { key: 'flying',     label: 'Flying',      type: 'boolean', default: false },
    ],
  },

  // ── Pickups ──────────────────────────────────────────────────────────────
  {
    id: 'pickup-key', label: 'Key', category: 'Pickups',
    mode: 'entity', field: 'pickups', color: '#f0c040',
    staticProps: { type: 'key' }, props: [],
  },
  {
    id: 'pickup-custom', label: 'Pickup (custom)', category: 'Pickups',
    mode: 'entity', field: 'pickups', color: '#a0c060',
    staticProps: {},
    props: [{ key: 'type', label: 'Type', type: 'text', default: 'item' }],
  },

  // ── Zones ────────────────────────────────────────────────────────────────
  {
    id: 'zone-pit', label: 'Pit', category: 'Zones',
    mode: 'area', field: 'zones', color: '#222222',
    staticProps: { type: 'pit' }, props: [],
  },
  {
    id: 'zone-damage', label: 'Damage', category: 'Zones',
    mode: 'area', field: 'zones', color: '#ff4400',
    staticProps: { type: 'damage' }, props: [],
  },
  {
    id: 'zone-ice', label: 'Ice', category: 'Zones',
    mode: 'area', field: 'zones', color: '#88aaff',
    staticProps: { type: 'ice' }, props: [],
  },
  {
    id: 'zone-heal', label: 'Heal', category: 'Zones',
    mode: 'area', field: 'zones', color: '#00cc66',
    staticProps: { type: 'heal' }, props: [],
  },
  {
    id: 'zone-directional', label: 'Directional', category: 'Zones',
    mode: 'area', field: 'zones', color: '#ffaa00',
    staticProps: { type: 'directional' },
    props: [
      { key: 'direction', label: 'Direction', type: 'select', options: ['up','down','left','right'], default: 'right' },
      { key: 'speed',     label: 'Speed (px/s)', type: 'number', default: 100 },
    ],
  },
  {
    id: 'zone-teleporter', label: 'Teleporter', category: 'Zones',
    mode: 'area', field: 'zones', color: '#cc44ff',
    staticProps: { type: 'teleporter' },
    props: [{ key: 'group', label: 'Group', type: 'text', default: 'a' }],
  },
  {
    id: 'zone-exit', label: 'Exit', category: 'Zones',
    mode: 'area', field: 'zones', color: '#ffd700',
    staticProps: { type: 'exit' }, props: [],
  },

  // ── Structure ────────────────────────────────────────────────────────────
  {
    id: 'obstacle', label: 'Obstacle', category: 'Structure',
    mode: 'area', field: 'obstacles', color: '#6a3808',
    staticProps: {}, props: [],
  },
  {
    id: 'locked-door', label: 'Locked Door', category: 'Structure',
    mode: 'area', field: 'lockedDoors', color: '#8866cc',
    staticProps: { requires: 'key' },
    props: [{ key: 'requires', label: 'Requires', type: 'text', default: 'key' }],
  },
  {
    id: 'switch', label: 'Switch', category: 'Structure',
    mode: 'entity', field: 'switches', color: '#dd4422',
    staticProps: {},
    props: [
      { key: 'group',    label: 'Group',    type: 'text',   default: 'a' },
      { key: 'mode',     label: 'Mode',     type: 'select', options: ['hold','toggle'], default: 'hold' },
      { key: 'requires', label: 'Requires', type: 'select', options: ['any','block'],   default: 'any'  },
    ],
  },
  {
    id: 'switch-door', label: 'Switch Door', category: 'Structure',
    mode: 'area', field: 'switchDoors', color: '#4466cc',
    staticProps: {},
    props: [{ key: 'group', label: 'Group', type: 'text', default: 'a' }],
  },
]

/** Unique categories in declaration order */
export const CATEGORIES = [...new Set(TOOLS.map(t => t.category))]

/** Look up a tool by id */
export const TOOL_BY_ID = new Map(TOOLS.map(t => [t.id, t]))

/**
 * Derive a display color for a placed item given its field and raw data.
 * Matches tools that have the same field and whose staticProps match the item.
 */
export function colorForItem(field: string, item: Record<string, unknown>): string {
  for (const tool of TOOLS) {
    if (tool.field !== field) continue
    const sp = tool.staticProps ?? {}
    if (Object.entries(sp).every(([k, v]) => item[k] === v)) return tool.color
  }
  return '#888888'
}
