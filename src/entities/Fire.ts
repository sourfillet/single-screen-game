import Phaser from 'phaser'

const FIRE_DURATION   = 7000  // ms total burn time
const DAMAGE_INTERVAL = 750   // ms between damage ticks

const FIRE_COLORS = [0xff4400, 0xff6600, 0xff2200, 0xffaa00, 0xff3300]

export class Fire {
  readonly gameObject: Phaser.GameObjects.Rectangle
  /** Tile column — used for spread checks and dedup. */
  readonly col: number
  /** Tile row — used for spread checks and dedup. */
  readonly row: number

  extinguished = false

  private lifeTimer   = 0
  // Start at full interval so the first damage tick fires immediately on contact
  private damageTimer = DAMAGE_INTERVAL
  private animTimer   = 0

  constructor(scene: Phaser.Scene, x: number, y: number, col: number, row: number) {
    this.col = col
    this.row = row
    this.gameObject = scene.add.rectangle(x, y, 28, 28, 0xff4400, 0.85).setDepth(1.5)
  }

  /** Advance timers and animate. Extinguishes automatically after FIRE_DURATION. */
  update(delta: number): void {
    if (this.extinguished) return

    this.lifeTimer += delta
    this.animTimer += delta

    // Flickering colour/alpha
    const alpha = 0.55 + 0.3 * Math.sin(this.animTimer * 0.012)
    const c = FIRE_COLORS[Math.floor(this.animTimer / 90) % FIRE_COLORS.length]
    this.gameObject.setFillStyle(c, alpha)

    if (this.lifeTimer >= FIRE_DURATION) {
      this.extinguish()
    }
  }

  /** Returns true when a damage tick fires this frame. */
  damageTick(delta: number): boolean {
    if (this.extinguished) return false
    this.damageTimer += delta
    if (this.damageTimer >= DAMAGE_INTERVAL) {
      this.damageTimer = 0
      return true
    }
    return false
  }

  /** Fade out and mark as done. Safe to call multiple times. */
  extinguish(): void {
    if (this.extinguished) return
    this.extinguished = true
    const scene = this.gameObject.scene
    scene.tweens.add({
      targets: this.gameObject,
      alpha: 0, scaleX: 0.5, scaleY: 0.5,
      duration: 500,
      onComplete: () => this.gameObject.destroy(),
    })
  }
}
