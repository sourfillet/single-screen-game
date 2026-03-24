import Phaser from 'phaser'

export type CardinalDirection = 'up' | 'down' | 'left' | 'right'

const COLOR   = 0xffaa00
const ALPHA   = 0.55
const DEFAULT_SPEED = 220

const ARROW_CHAR: Record<CardinalDirection, string> = {
  up: '↑', down: '↓', left: '←', right: '→',
}

/**
 * Conveyor-style zone that overrides the velocity of any entity inside it,
 * pushing them toward one edge regardless of their own movement.
 */
export class DirectionalZone {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly vx: number
  readonly vy: number

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    direction: CardinalDirection,
    speed = DEFAULT_SPEED,
  ) {
    switch (direction) {
      case 'up':    this.vx = 0;      this.vy = -speed; break
      case 'down':  this.vx = 0;      this.vy =  speed; break
      case 'left':  this.vx = -speed; this.vy = 0;      break
      case 'right': this.vx =  speed; this.vy = 0;      break
    }

    this.gameObject = scene.add.rectangle(x, y, w, h, COLOR, ALPHA)
    scene.physics.add.existing(this.gameObject, true)

    // Direction arrow centred inside the zone
    scene.add
      .text(x, y, ARROW_CHAR[direction], { fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(2)
  }
}
