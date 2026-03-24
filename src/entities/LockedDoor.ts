import Phaser from 'phaser'

const DOOR_COLOR  = 0x8040c0   // purple
const OPEN_DURATION = 300

/**
 * A solid obstacle that blocks movement.
 * Opened by calling `open()` when the player carries the required item.
 * The `requires` string matches an inventory key (e.g. `'key'`).
 */
export class LockedDoor {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly requires: string
  private _open = false

  get isOpen(): boolean { return this._open }

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    requires: string,
  ) {
    this.requires = requires
    this.gameObject = scene.add.rectangle(x, y, w, h, DOOR_COLOR)
    scene.physics.add.existing(this.gameObject, true)
  }

  /** Slide and fade the door away, then disable its physics body. */
  open(): void {
    if (this._open) return
    this._open = true

    const body = this.gameObject.body as Phaser.Physics.Arcade.StaticBody
    body.enable = false

    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      alpha: 0,
      scaleY: 0,
      duration: OPEN_DURATION,
      ease: 'Power2',
      onComplete: () => this.gameObject.destroy(),
    })
  }
}
