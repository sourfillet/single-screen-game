import Phaser from 'phaser'
import { TILE_SIZE } from '../data/rooms'
import { EditorScene, type EditorContext } from './EditorScene'
import { emptyRoom } from './state'
import { buildUI } from './ui'

// ── Shared context ──────────────────────────────────────────────────────────
const room = emptyRoom(25, 19)

const ctx: EditorContext = {
  room,
  activeTool:  null,
  activeProps: {},
  onChanged:   () => { /* filled in after scene is ready */ },
}

// ── DOM UI ──────────────────────────────────────────────────────────────────
function resizeRoom(w: number, h: number): void {
  ctx.room.width  = w
  ctx.room.height = h
  game.scene.getScene('EditorScene')?.scene.restart({ ctx })
}

buildUI(ctx, resizeRoom)

// ── Phaser ──────────────────────────────────────────────────────────────────
const game = new Phaser.Game({
  type:            Phaser.CANVAS,
  parent:          'canvas-container',
  backgroundColor: '#1a1a1a',
  pixelArt:        true,
  scene:           [],   // added manually below so we can pass ctx
  scale:           { mode: Phaser.Scale.RESIZE },
})

game.events.on(Phaser.Core.Events.READY, () => {
  game.scene.add('EditorScene', EditorScene, true, { ctx })

  // Wire up the refresh callback now that the scene exists
  ctx.onChanged = () => {
    const s = game.scene.getScene('EditorScene') as EditorScene | null
    s?.refresh()
  }
})
