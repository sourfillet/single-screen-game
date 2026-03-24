import Phaser from 'phaser'

// One colour per group index so paired teleporters share a colour
const GROUP_COLORS = [0xcc44ff, 0xff44aa, 0x44ccff, 0xffcc22, 0x44ffaa]
const ALPHA        = 0.70
const COOLDOWN_MS  = 1200

/**
 * Teleports the player to the next zone in the same group (wraps around).
 * A cooldown on both source and destination prevents immediate bounce-back.
 */
export class TeleporterZone {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly group: string

  private lastUsedAt = -Infinity

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    group: string,
    groupIndex: number,
  ) {
    this.group = group
    const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length]

    this.gameObject = scene.add.rectangle(x, y, w, h, color, ALPHA).setDepth(1)
    scene.physics.add.existing(this.gameObject, true)

    // Pulsing so it reads as interactive
    scene.tweens.add({
      targets: this.gameObject,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Group label so linked zones are visually associated
    scene.add
      .text(x, y, group, { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(3)
  }

  canTeleport(now: number): boolean {
    return now - this.lastUsedAt >= COOLDOWN_MS
  }

  markUsed(now: number): void {
    this.lastUsedAt = now
  }
}
