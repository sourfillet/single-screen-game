import Phaser from 'phaser'
import type { Player } from '../entities/Player'
import heartFullUrl from '../sprites/heart-full.png'
import heartHalfUrl from '../sprites/heart-half.png'

export const HEART_FULL_KEY = 'heart-full'
export const HEART_HALF_KEY = 'heart-half'
export const HEART_FULL_URL = heartFullUrl
export const HEART_HALF_URL = heartHalfUrl

const HEART_SIZE = 16
const HEART_GAP  = 2
const MARGIN     = 8

/**
 * HUD element that shows one sprite per heart slot (2 HP each).
 * Re-creates image objects only when HP changes.
 */
export class HealthBar {
  private scene: Phaser.Scene
  private images: Phaser.GameObjects.Image[] = []
  private lastRenderedHp = -1
  private readonly maxHp: number

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene  = scene
    this.maxHp  = player.maxHealth
    this.draw(player.health, player.maxHealth)
  }

  update(player: Player): void {
    if (player.health === this.lastRenderedHp) return
    this.draw(player.health, player.maxHealth)
  }

  private draw(hp: number, maxHp: number): void {
    this.lastRenderedHp = hp
    for (const img of this.images) img.destroy()
    this.images = []

    const hearts = Math.ceil(maxHp / 2)
    for (let i = 0; i < hearts; i++) {
      const cx = MARGIN + HEART_SIZE / 2 + i * (HEART_SIZE + HEART_GAP)
      const cy = MARGIN + HEART_SIZE / 2
      const filled = hp - i * 2

      // Empty slot: dim the full heart sprite rather than misusing the half-heart
      const key   = filled >= 1 ? (filled >= 2 ? HEART_FULL_KEY : HEART_HALF_KEY) : HEART_FULL_KEY
      const alpha = filled <= 0 ? 0.25 : 1

      this.images.push(
        this.scene.add.image(cx, cy, key)
          .setScrollFactor(0)
          .setDepth(20)
          .setAlpha(alpha)
      )
    }
  }
}
