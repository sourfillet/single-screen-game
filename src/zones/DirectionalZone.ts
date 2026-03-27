import Phaser from 'phaser'
import { TILE_SIZE } from '../data/rooms'
import { DIRECTIONAL_PAD_KEY } from '../assets/directionalPadSprites'

export type CardinalDirection = 'up' | 'down' | 'left' | 'right'

const DEFAULT_SPEED  = 220
const SCROLL_SPEED   = 60   // texture pixels per second

// Frames drawn pointing right — rotate to match other directions.
const DIRECTION_ANGLE: Record<CardinalDirection, number> = {
  right:   0,
  down:   90,
  left:  180,
  up:   -90,
}

/**
 * Conveyor-style zone that overrides the velocity of any entity inside it.
 * Visually, a seamless TileSprite texture scrolls across the zone each frame.
 * Call update(delta) every frame to advance the scroll.
 */
export class DirectionalZone {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly vx: number
  readonly vy: number

  private readonly tileSprites: Phaser.GameObjects.TileSprite[] = []

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

    // Invisible physics body covering the full zone
    this.gameObject = scene.add.rectangle(x, y, w, h, 0, 0)
    scene.physics.add.existing(this.gameObject, true)

    const angle = DIRECTION_ANGLE[direction]

    // For up/down zones, swap w and h before rotating so the texture stays
    // oriented along the direction of travel, then the 90° rotation brings it
    // back into alignment with the zone's world footprint.
    const tsW = (direction === 'up' || direction === 'down') ? h : w
    const tsH = (direction === 'up' || direction === 'down') ? w : h

    const ts = scene.add.tileSprite(x, y, tsW, tsH, DIRECTIONAL_PAD_KEY)
    // Scale the tile so each repetition is exactly one 32×32 world tile,
    // regardless of the source image's actual pixel dimensions.
    const src = scene.textures.get(DIRECTIONAL_PAD_KEY).getSourceImage() as HTMLImageElement
    ts.tileScaleX = TILE_SIZE / src.width
    ts.tileScaleY = TILE_SIZE / src.height
    ts.setAngle(angle)
    ts.setDepth(1)
    this.tileSprites.push(ts)
  }

  /** Call every frame from GameScene.update() to advance the scroll animation. */
  update(delta: number): void {
    const shift = SCROLL_SPEED * (delta / 1000)
    for (const ts of this.tileSprites) {
      ts.tilePositionX -= shift
    }
  }
}
