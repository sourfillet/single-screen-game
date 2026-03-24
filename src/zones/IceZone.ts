import Phaser from 'phaser'

const COLOR        = 0x99ddff
const EDGE_COLOR   = 0xccf0ff
const EDGE_PADDING = 3
const ALPHA        = 0.50

/**
 * Slippery zone. Objects on ice accelerate gradually rather than changing
 * velocity instantly, creating a sliding effect. IceZone itself is purely
 * visual + physics body — the slide logic lives in GameScene.icePass().
 */
export class IceZone {
  readonly gameObject: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    scene.add.rectangle(x, y, w + EDGE_PADDING * 2, h + EDGE_PADDING * 2, EDGE_COLOR, ALPHA + 0.1)
    this.gameObject = scene.add.rectangle(x, y, w, h, COLOR, ALPHA)
    scene.physics.add.existing(this.gameObject, true)
  }
}
