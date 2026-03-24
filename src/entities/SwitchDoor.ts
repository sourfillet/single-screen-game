import Phaser from 'phaser'

const CLOSED_COLOR = 0xcc3300   // red-orange when shut
const OPEN_DURATION   = 250
const CLOSE_DURATION  = 150

/**
 * A solid door controlled by one or more Switch entities sharing the same `group`.
 * Unlike LockedDoor, this can reopen and reclose any number of times.
 */
export class SwitchDoor {
  readonly gameObject: Phaser.GameObjects.Rectangle
  readonly group: string

  private _open = false

  get isOpen(): boolean { return this._open }

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    group: string,
  ) {
    this.group = group
    this.gameObject = scene.add.rectangle(x, y, w, h, CLOSED_COLOR)
    scene.physics.add.existing(this.gameObject, true)
  }

  setOpen(open: boolean): void {
    if (this._open === open) return
    this._open = open

    const body = this.gameObject.body as Phaser.Physics.Arcade.StaticBody
    const scene = this.gameObject.scene

    scene.tweens.killTweensOf(this.gameObject)

    if (open) {
      body.enable = false
      scene.tweens.add({
        targets: this.gameObject,
        alpha: 0,
        scaleY: 0,
        duration: OPEN_DURATION,
        ease: 'Power2',
      })
    } else {
      // Restore geometry before re-enabling so the static body is in the right place
      this.gameObject.setScale(1, 1)
      this.gameObject.setAlpha(1)
      body.reset(this.gameObject.x, this.gameObject.y)
      body.enable = true
      // Animate in
      this.gameObject.setAlpha(0)
      this.gameObject.setScale(1, 0)
      scene.tweens.add({
        targets: this.gameObject,
        alpha: 1,
        scaleY: 1,
        duration: CLOSE_DURATION,
        ease: 'Power2',
      })
    }
  }
}
