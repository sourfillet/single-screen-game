import Phaser from 'phaser'

const SCALE = 1
const OPEN_DURATION = 300

/**
 * A solid 1×1-tile block that can only be removed when the player bumps into it
 * while carrying the required item (default: 'key').
 */
export class LockedBlock {
  readonly gameObject: Phaser.Physics.Arcade.Image
  readonly requires: string
  private _open = false

  get isOpen(): boolean { return this._open }

  constructor(scene: Phaser.Scene, x: number, y: number, requires: string) {
    this.requires = requires
    this.gameObject = scene.physics.add
      .image(x, y, 'block_locked')
      .setScale(SCALE)
      .setDepth(2)
    ;(this.gameObject.body as Phaser.Physics.Arcade.Body).setImmovable(true)
  }

  /** Consume the player's required item and play an open animation. */
  open(): void {
    if (this._open) return
    this._open = true
    ;(this.gameObject.body as Phaser.Physics.Arcade.Body).enable = false
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      alpha: 0, scaleY: 0,
      duration: OPEN_DURATION,
      ease: 'Power2',
      onComplete: () => this.gameObject.destroy(),
    })
  }
}
