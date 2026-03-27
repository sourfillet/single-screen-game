import Phaser from 'phaser'
import { TILE_SIZE } from '../data/rooms'
import { FLOOR_TILE_KEY, FLOOR_TILE_URL } from '../assets/floorTile'
import { TILE_PALETTE } from '../assets/tilePalette'
import { TOOLS, colorForItem, toolForItem, type ToolDef } from './tools'
import { placeEntity, placeArea, deleteAt, updateItem, paintTile, eraseTile, type EditorRoom } from './state'

export interface Selection {
  field: string
  index: number
}

export interface EditorContext {
  room:        EditorRoom
  activeTool:  ToolDef | null
  activeProps: Record<string, unknown>
  selection:   Selection | null
  /** 'tiles' = tile-painting mode, 'objects' = entity/zone placement mode */
  editorMode:           'tiles' | 'objects'
  /** Active tile texture key when in tile mode */
  activeTileTexture:    string | null
  /** Which layer is being painted */
  activeTileLayer:      'base' | 'top'
  /** Hidden pickup type for top tiles (empty string = none) */
  activeTileHiddenPickup: string
  /** Called after any room mutation so the canvas redraws. */
  onChanged:   () => void
  /** Called after selection changes so the Properties panel rebuilds. */
  refreshProps: () => void
}

const GRID_COLOR   = 0x444444
const WALL_ALPHA   = 0.45
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
  stroke: '#000000', strokeThickness: 2,
}

export class EditorScene extends Phaser.Scene {
  private ctx!: EditorContext

  // Graphics layers
  private itemsGfx!:   Phaser.GameObjects.Graphics
  private ghostGfx!:   Phaser.GameObjects.Graphics
  private labelGroup!: Phaser.GameObjects.Group

  // Tile image groups
  private baseTileGroup!: Phaser.GameObjects.Group
  private topTileGroup!:  Phaser.GameObjects.Group

  // Drag state for area placement
  private dragStart: { col: number; row: number } | null = null
  private dragging = false

  // Tile-mode paint state (click-drag to fill)
  private isPainting = false
  private lastPaintTile: { col: number; row: number } | null = null

  // Pan state
  private panStart: { x: number; y: number; scrollX: number; scrollY: number } | null = null
  private spaceDown = false

  constructor() { super({ key: 'EditorScene' }) }

  init(data: { ctx: EditorContext }): void {
    this.ctx = data.ctx
  }

  preload(): void {
    this.load.image(FLOOR_TILE_KEY, FLOOR_TILE_URL)
    for (const { key, url } of TILE_PALETTE) {
      this.load.image(key, url)
    }
  }

  create(): void {
    const { room } = this.ctx
    const W = room.width  * TILE_SIZE
    const H = room.height * TILE_SIZE

    // Floor
    this.add.tileSprite(W / 2, H / 2, W, H, FLOOR_TILE_KEY).setDepth(0)

    // Tile image groups (above floor, below items)
    this.baseTileGroup = this.add.group()
    this.topTileGroup  = this.add.group()

    // Wall border darkening
    const wallGfx = this.add.graphics().setDepth(1)
    wallGfx.fillStyle(0x000000, WALL_ALPHA)
    wallGfx.fillRect(0,           0,            W,      TILE_SIZE)
    wallGfx.fillRect(0,           H - TILE_SIZE, W,     TILE_SIZE)
    wallGfx.fillRect(0,           TILE_SIZE,     TILE_SIZE,       H - 2 * TILE_SIZE)
    wallGfx.fillRect(W - TILE_SIZE, TILE_SIZE,   TILE_SIZE,       H - 2 * TILE_SIZE)

    // Grid lines
    const gridGfx = this.add.graphics().setDepth(2)
    gridGfx.lineStyle(1, GRID_COLOR, 0.35)
    for (let c = 0; c <= room.width;  c++) gridGfx.lineBetween(c * TILE_SIZE, 0, c * TILE_SIZE, H)
    for (let r = 0; r <= room.height; r++) gridGfx.lineBetween(0, r * TILE_SIZE, W, r * TILE_SIZE)

    this.itemsGfx   = this.add.graphics().setDepth(3)
    this.labelGroup = this.add.group()
    this.ghostGfx   = this.add.graphics().setDepth(5)

    this.drawTiles()
    this.drawItems()

    // Disable right-click context menu over canvas
    this.input.mouse?.disableContextMenu()

    this.input.on(Phaser.Input.Events.POINTER_MOVE,  this.onMove,  this)
    this.input.on(Phaser.Input.Events.POINTER_DOWN,  this.onDown,  this)
    this.input.on(Phaser.Input.Events.POINTER_UP,    this.onUp,    this)
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this)

    this.input.keyboard?.on('keydown-SPACE', () => { this.spaceDown = true  })
    this.input.keyboard?.on('keyup-SPACE',   () => { this.spaceDown = false; this.panStart = null })
  }

  /** Called externally (import, resize, reset) to force a full redraw. */
  refresh(): void {
    this.drawTiles()
    this.drawItems()
  }

  // ── Input ───────────────────────────────────────────────────────────────

  private tileAt(p: Phaser.Input.Pointer): { col: number; row: number } {
    return { col: Math.floor(p.worldX / TILE_SIZE), row: Math.floor(p.worldY / TILE_SIZE) }
  }

  private onWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: unknown[],
    _deltaX: number,
    deltaY: number,
  ): void {
    const cam     = this.cameras.main
    const oldZoom = cam.zoom
    const newZoom = Phaser.Math.Clamp(oldZoom * (deltaY > 0 ? 0.9 : 1.1), 0.25, 4)

    // Keep the world point under the cursor fixed while zooming
    const worldX = cam.scrollX + pointer.x / oldZoom
    const worldY = cam.scrollY + pointer.y / oldZoom
    cam.setZoom(newZoom)
    cam.scrollX = worldX - pointer.x / newZoom
    cam.scrollY = worldY - pointer.y / newZoom
  }

  private isPanning(p: Phaser.Input.Pointer): boolean {
    return p.middleButtonDown() || (this.spaceDown && p.leftButtonDown())
  }

  private onMove(p: Phaser.Input.Pointer): void {
    // Pan
    if (this.panStart) {
      const cam = this.cameras.main
      cam.scrollX = this.panStart.scrollX - (p.x - this.panStart.x) / cam.zoom
      cam.scrollY = this.panStart.scrollY - (p.y - this.panStart.y) / cam.zoom
      return
    }

    const t = this.tileAt(p)
    document.getElementById('statusbar')!.textContent = `col ${t.col}, row ${t.row}`
    this.drawGhost(p)

    // Tile-mode drag painting
    if (this.ctx.editorMode === 'tiles' && this.isPainting) {
      if (this.lastPaintTile?.col === t.col && this.lastPaintTile?.row === t.row) return
      this.lastPaintTile = t
      if (p.rightButtonDown()) {
        eraseTile(this.ctx.room, this.ctx.activeTileLayer, t.col, t.row)
      } else if (this.ctx.activeTileTexture) {
        paintTile(
          this.ctx.room, this.ctx.activeTileLayer, t.col, t.row,
          this.ctx.activeTileTexture,
          this.ctx.activeTileHiddenPickup || undefined,
        )
      }
      this.ctx.onChanged()
      this.drawTiles()
    }
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // Start pan on middle-mouse or space+left
    if (this.isPanning(p)) {
      this.panStart = {
        x: p.x, y: p.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      }
      return
    }

    const t = this.tileAt(p)

    // ── Tile mode ────────────────────────────────────────────────────────
    if (this.ctx.editorMode === 'tiles') {
      this.isPainting = true
      this.lastPaintTile = t
      if (p.rightButtonDown()) {
        eraseTile(this.ctx.room, this.ctx.activeTileLayer, t.col, t.row)
      } else if (this.ctx.activeTileTexture) {
        paintTile(
          this.ctx.room, this.ctx.activeTileLayer, t.col, t.row,
          this.ctx.activeTileTexture,
          this.ctx.activeTileHiddenPickup || undefined,
        )
      }
      this.ctx.onChanged()
      this.drawTiles()
      return
    }

    // ── Object mode ───────────────────────────────────────────────────────
    if (p.rightButtonDown()) {
      deleteAt(this.ctx.room, t.col, t.row)
      // Clear selection if the deleted item was selected
      if (this.ctx.selection) { this.ctx.selection = null; this.ctx.refreshProps() }
      this.ctx.onChanged()
      this.drawItems()
      return
    }

    const tool = this.ctx.activeTool

    if (!tool) {
      // No tool active — try to select the item at this tile
      const hit = this.itemAt(t.col, t.row)
      const changed = JSON.stringify(hit) !== JSON.stringify(this.ctx.selection)
      this.ctx.selection = hit
      if (changed) this.ctx.refreshProps()
      this.drawItems()
      return
    }

    // Placing with a tool clears selection
    this.ctx.selection = null

    if (tool.mode === 'entity') {
      const props = this.buildProps(tool)
      placeEntity(this.ctx.room, tool.field, t.col, t.row, props)
      this.ctx.onChanged()
      this.drawItems()
    } else {
      this.dragStart = t
      this.dragging  = true
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.panStart && !p.leftButtonDown() && !p.middleButtonDown()) {
      this.panStart = null
      return
    }

    // Stop tile painting
    if (this.ctx.editorMode === 'tiles') {
      this.isPainting    = false
      this.lastPaintTile = null
      return
    }

    if (!this.dragging || !this.dragStart) { this.dragging = false; return }
    const tool = this.ctx.activeTool
    if (!tool) { this.dragging = false; return }

    const t = this.tileAt(p)
    const x = Math.min(this.dragStart.col, t.col)
    const y = Math.min(this.dragStart.row, t.row)
    const w = Math.abs(t.col - this.dragStart.col) + 1
    const h = Math.abs(t.row - this.dragStart.row) + 1

    const props = this.buildProps(tool)
    placeArea(this.ctx.room, tool.field, x, y, w, h, props)
    this.ctx.onChanged()
    this.drawItems()

    this.dragging  = false
    this.dragStart = null
    this.ghostGfx.clear()
  }

  /** Merge staticProps + current activeProps into the item props object. */
  private buildProps(tool: ToolDef): Record<string, unknown> {
    return { ...(tool.staticProps ?? {}), ...this.ctx.activeProps }
  }

  /** Find the item occupying tile (col, row), searching entities then areas. */
  private itemAt(col: number, row: number): Selection | null {
    const entityFields = ['blocks', 'pots', 'enemies', 'pickups', 'switches', 'lockedBlocks']
    const areaFields   = ['zones', 'obstacles', 'lockedDoors', 'switchDoors']
    const room = this.ctx.room

    for (const field of entityFields) {
      const arr = room[field as keyof typeof room] as Record<string, unknown>[]
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]['x'] === col && arr[i]['y'] === row) return { field, index: i }
      }
    }
    for (const field of areaFields) {
      const arr = room[field as keyof typeof room] as Record<string, unknown>[]
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i]
        const inX = col >= (it['x'] as number) && col < (it['x'] as number) + (it['w'] as number)
        const inY = row >= (it['y'] as number) && row < (it['y'] as number) + (it['h'] as number)
        if (inX && inY) return { field, index: i }
      }
    }
    if (col === room.spawnX && row === room.spawnY) return { field: '_spawn', index: 0 }
    return null
  }

  // ── Drawing ─────────────────────────────────────────────────────────────

  /** Render painted tiles (base and top layers). */
  private drawTiles(): void {
    this.baseTileGroup.clear(true, true)
    this.topTileGroup.clear(true, true)

    for (const tile of this.ctx.room.baseTiles) {
      const img = this.add.image(
        tile.x * TILE_SIZE + TILE_SIZE / 2,
        tile.y * TILE_SIZE + TILE_SIZE / 2,
        tile.texture,
      ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0.5)
      this.baseTileGroup.add(img)
    }

    for (const tile of this.ctx.room.topTiles) {
      const img = this.add.image(
        tile.x * TILE_SIZE + TILE_SIZE / 2,
        tile.y * TILE_SIZE + TILE_SIZE / 2,
        tile.texture,
      ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0.65)
      // Tint to distinguish: orange if it hides a pickup, purple otherwise
      img.setTint(tile.hiddenPickup ? 0xffcc88 : 0xddbbff)
      this.topTileGroup.add(img)
    }
  }

  private drawItems(): void {
    const { room } = this.ctx
    const g = this.itemsGfx
    g.clear()
    this.labelGroup.clear(true, true)

    const entityFields = ['blocks', 'pots', 'enemies', 'pickups', 'switches', 'lockedBlocks']
    const areaFields   = ['zones', 'obstacles', 'lockedDoors', 'switchDoors']

    const DIRECTION_ARROWS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' }

    for (const field of areaFields) {
      const arr = room[field as keyof typeof room] as Record<string,unknown>[]
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        const color = colorForItem(field, item)
        let label = String(item['type'] ?? field)
        if (item['type'] === 'directional' && item['direction']) {
          label = DIRECTION_ARROWS[item['direction'] as string] ?? label
        }
        const selected = this.ctx.selection?.field === field && this.ctx.selection?.index === i
        this.drawArea(g, item, color, label, selected)
      }
    }
    for (const field of entityFields) {
      const arr = room[field as keyof typeof room] as Record<string,unknown>[]
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        const color = colorForItem(field, item)
        const selected = this.ctx.selection?.field === field && this.ctx.selection?.index === i
        this.drawEntity(g, item, color, field, selected)
      }
    }

    // Spawn point
    this.drawSpawnMarker(g, room.spawnX, room.spawnY)
  }

  private drawEntity(
    g: Phaser.GameObjects.Graphics,
    item: Record<string,unknown>, color: string, label: string,
    selected = false,
  ): void {
    const x = (item['x'] as number) * TILE_SIZE
    const y = (item['y'] as number) * TILE_SIZE
    const hex = parseInt(color.replace('#', ''), 16)
    g.fillStyle(hex, 0.75)
    g.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    g.lineStyle(selected ? 2 : 1, selected ? 0xffffff : hex, 1)
    g.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    const abbr = label.slice(0, 2).toUpperCase()
    const txt = this.add.text(x + 3, y + 3, abbr, LABEL_STYLE).setDepth(4)
    this.labelGroup.add(txt)
  }

  private drawArea(
    g: Phaser.GameObjects.Graphics,
    item: Record<string,unknown>, color: string, label: string,
    selected = false,
  ): void {
    const x  = (item['x'] as number) * TILE_SIZE
    const y  = (item['y'] as number) * TILE_SIZE
    const pw = (item['w'] as number) * TILE_SIZE
    const ph = (item['h'] as number) * TILE_SIZE
    const hex = parseInt(color.replace('#', ''), 16)
    g.fillStyle(hex, 0.25)
    g.fillRect(x, y, pw, ph)
    g.lineStyle(selected ? 2 : 2, selected ? 0xffffff : hex, selected ? 1 : 0.85)
    g.strokeRect(x + 1, y + 1, pw - 2, ph - 2)
    const txt = this.add.text(x + 4, y + 4, label, LABEL_STYLE).setDepth(4)
    this.labelGroup.add(txt)
  }

  private drawSpawnMarker(g: Phaser.GameObjects.Graphics, col: number, row: number): void {
    const cx = col * TILE_SIZE + TILE_SIZE / 2
    const cy = row * TILE_SIZE + TILE_SIZE / 2
    g.lineStyle(2, 0x00ff66, 0.9)
    g.strokeCircle(cx, cy, TILE_SIZE / 2 - 3)
    g.fillStyle(0x00ff66, 0.5)
    g.fillCircle(cx, cy, 5)
    const txt = this.add.text(col * TILE_SIZE + 3, row * TILE_SIZE + 3, 'SP', LABEL_STYLE).setDepth(4)
    this.labelGroup.add(txt)
  }

  private drawGhost(p: Phaser.Input.Pointer): void {
    const g = this.ghostGfx
    g.clear()

    // Tile mode: highlight hovered cell
    if (this.ctx.editorMode === 'tiles') {
      const t = this.tileAt(p)
      const color = this.ctx.activeTileLayer === 'top' ? 0xddbbff : 0xffffff
      g.lineStyle(2, color, 0.7)
      g.strokeRect(t.col * TILE_SIZE, t.row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      return
    }

    const tool = this.ctx.activeTool
    if (!tool) return

    const t = this.tileAt(p)
    const hex = parseInt(tool.color.replace('#', ''), 16)

    if (tool.mode === 'entity') {
      g.fillStyle(hex, 0.45)
      g.fillRect(t.col * TILE_SIZE + 2, t.row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    } else if (this.dragging && this.dragStart) {
      const x = Math.min(this.dragStart.col, t.col) * TILE_SIZE
      const y = Math.min(this.dragStart.row, t.row) * TILE_SIZE
      const w = (Math.abs(t.col - this.dragStart.col) + 1) * TILE_SIZE
      const h = (Math.abs(t.row - this.dragStart.row) + 1) * TILE_SIZE
      g.fillStyle(hex, 0.25)
      g.fillRect(x, y, w, h)
      g.lineStyle(2, hex, 0.8)
      g.strokeRect(x, y, w, h)
    } else {
      g.lineStyle(2, hex, 0.5)
      g.strokeRect(t.col * TILE_SIZE + 1, t.row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
    }
  }
}
