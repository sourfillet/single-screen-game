import Phaser from 'phaser'
import type { Player } from '../entities/Player'

const HEAL_AMOUNT    = 1
const HEAL_INTERVAL  = 1500  // ms — slower cadence than damage zones to keep it balanced
const COLOR          = 0x20dd60
const ALPHA          = 0.55
const PULSE_MIN_ALPHA = 0.30
const PULSE_DURATION  = 700

/**
 * Restorative zone that heals the player periodically while they stand in it.
 */
export class HealZone {
  readonly gameObject: Phaser.GameObjects.Rectangle

  private lastHealTime = -Infinity

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    this.gameObject = scene.add.rectangle(x, y, w, h, COLOR, ALPHA)
    scene.physics.add.existing(this.gameObject, true)

    scene.tweens.add({
      targets: this.gameObject,
      alpha: PULSE_MIN_ALPHA,
      duration: PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /** Called each frame the player overlaps this zone. */
  onOverlap(player: Player, now: number): void {
    if (now - this.lastHealTime >= HEAL_INTERVAL) {
      this.lastHealTime = now
      player.heal(HEAL_AMOUNT)
    }
  }
}
