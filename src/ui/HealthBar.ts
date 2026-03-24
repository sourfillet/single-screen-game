import Phaser from 'phaser'
import type { Player } from '../entities/Player'

const HEART_SIZE  = 14
const HEART_GAP   = 4
const MARGIN      = 10
const COLOR_FULL  = 0xe03030
const COLOR_EMPTY = 0x553030

/**
 * HUD element that draws one square per heart (2 HP each).
 * Re-draws only when the player's HP changes.
 */
export class HealthBar {
  private graphics: Phaser.GameObjects.Graphics
  private lastRenderedHp = -1
  private readonly maxHp: number

  constructor(scene: Phaser.Scene, player: Player) {
    this.maxHp = player.maxHealth
    this.graphics = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(20)

    this.draw(player.health, player.maxHealth)
  }

  update(player: Player): void {
    if (player.health === this.lastRenderedHp) return
    this.draw(player.health, player.maxHealth)
  }

  private draw(hp: number, maxHp: number): void {
    this.lastRenderedHp = hp
    this.graphics.clear()

    const hearts = Math.ceil(maxHp / 2)

    for (let i = 0; i < hearts; i++) {
      const x = MARGIN + i * (HEART_SIZE + HEART_GAP)
      const y = MARGIN
      const filled = hp - i * 2  // HP remaining for this heart slot (0, 1, or 2)

      if (filled >= 2) {
        // Full heart
        this.graphics.fillStyle(COLOR_FULL)
        this.graphics.fillRect(x, y, HEART_SIZE, HEART_SIZE)
      } else if (filled === 1) {
        // Half heart — left half filled
        this.graphics.fillStyle(COLOR_FULL)
        this.graphics.fillRect(x, y, Math.floor(HEART_SIZE / 2), HEART_SIZE)
        this.graphics.fillStyle(COLOR_EMPTY)
        this.graphics.fillRect(x + Math.floor(HEART_SIZE / 2), y, Math.ceil(HEART_SIZE / 2), HEART_SIZE)
      } else {
        // Empty heart
        this.graphics.fillStyle(COLOR_EMPTY)
        this.graphics.fillRect(x, y, HEART_SIZE, HEART_SIZE)
      }
    }
  }
}
