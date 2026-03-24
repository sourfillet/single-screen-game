import Phaser from 'phaser'
import type { DPadState } from '../types'

const BTN_SIZE = 48
const BTN_COLOR = 0x444466
const BTN_ALPHA = 0.75
const MARGIN = 24

/**
 * On-screen directional pad for touch / mobile input.
 * Rendered in screen space at the bottom-left corner.
 */
export class DPad {
  readonly state: DPadState = { up: false, down: false, left: false, right: false, shield: false, colorCycle: false }

  constructor(scene: Phaser.Scene) {
    const cx = MARGIN + BTN_SIZE * 1.5
    const cy = scene.scale.height - MARGIN - BTN_SIZE * 1.5

    this.makeButton(scene, cx,            cy - BTN_SIZE, 'up',    '▲')
    this.makeButton(scene, cx,            cy + BTN_SIZE, 'down',  '▼')
    this.makeButton(scene, cx - BTN_SIZE, cy,            'left',  '◀')
    this.makeButton(scene, cx + BTN_SIZE, cy,            'right', '▶')

    // Action buttons — bottom-right corner, stacked vertically
    const ax = scene.scale.width - MARGIN - BTN_SIZE
    this.makeButton(scene, ax, scene.scale.height - MARGIN - BTN_SIZE,             'shield',     'SHD')
    this.makeButton(scene, ax, scene.scale.height - MARGIN - BTN_SIZE * 2 - MARGIN, 'colorCycle', 'CLR')
  }

  private makeButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dir: keyof DPadState,
    label: string,
  ): void {
    const btn = scene.add
      .rectangle(x, y, BTN_SIZE, BTN_SIZE, BTN_COLOR, BTN_ALPHA)
      .setInteractive()
      .setDepth(10)
      .setScrollFactor(0)

    scene.add
      .text(x, y, label, { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(11)
      .setScrollFactor(0)

    btn.on('pointerdown', () => { this.state[dir] = true })
    btn.on('pointerup',   () => { this.state[dir] = false })
    btn.on('pointerout',  () => { this.state[dir] = false })
  }
}
