import Phaser from 'phaser'
import type { Player } from '../entities/Player'

const DAMAGE_AMOUNT   = 1
const DAMAGE_INTERVAL = 750   // ms between hits while standing in the zone
const COLOR           = 0x30bb20
const ALPHA           = 0.55
const PULSE_MIN_ALPHA = 0.30
const PULSE_DURATION  = 600   // ms per pulse half-cycle

/**
 * Hazard zone that deals periodic damage while the player stands in it.
 * Rendered below the player; the player walks through it freely (overlap, not collider).
 */
export class DamageZone {
  readonly gameObject: Phaser.GameObjects.Rectangle

  private lastHitTime = -Infinity

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    this.gameObject = scene.add.rectangle(x, y, w, h, COLOR, ALPHA)
    scene.physics.add.existing(this.gameObject, true)   // static body for overlap checks

    // Pulsing alpha so the hazard reads clearly as "dangerous"
    scene.tweens.add({
      targets: this.gameObject,
      alpha: PULSE_MIN_ALPHA,
      duration: PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /** Called each frame the player overlaps this zone. `now` = scene time in ms. */
  onOverlap(player: Player, now: number): void {
    if (now - this.lastHitTime >= DAMAGE_INTERVAL) {
      this.lastHitTime = now
      player.takeDamage(DAMAGE_AMOUNT)
    }
  }
}
