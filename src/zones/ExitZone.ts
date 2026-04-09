import Phaser from 'phaser'

const COLOR       = 0xf0d000   // golden yellow
const PULSE_MIN   = 0.55
const PULSE_MAX   = 0.85
const PULSE_DURATION = 700

/**
 * Step on this zone to complete the level.
 * GameScene listens for overlap and calls `handleExit()`.
 */
export class ExitZone {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly targetRoom: string | undefined
  readonly targetSpawnX: number | undefined
  readonly targetSpawnY: number | undefined

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    targetRoom?: string,
    targetSpawnX?: number,
    targetSpawnY?: number,
  ) {
    this.targetRoom   = targetRoom
    this.targetSpawnX = targetSpawnX
    this.targetSpawnY = targetSpawnY
    this.gameObject = scene.add.rectangle(x, y, w, h, COLOR, PULSE_MAX)
    scene.physics.add.existing(this.gameObject, true)

    scene.tweens.add({
      targets: this.gameObject,
      alpha: { from: PULSE_MAX, to: PULSE_MIN },
      duration: PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}
