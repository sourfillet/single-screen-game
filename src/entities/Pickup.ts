import Phaser from 'phaser'

const SCALE_PULSE_DURATION = 600
const COLLECT_DURATION     = 200

// Visual colour per pickup type — extend this map to add new types.
const TYPE_COLORS: Record<string, number> = {
  key:     0xf0c040,  // gold
  default: 0x80ff80,  // light green fallback
}

/**
 * Generic pickup that sits on the floor and waits for the player to walk over it.
 * Each pickup has a `type` string (e.g. `'key'`) that maps to the player's inventory.
 *
 * To add a new pickup type, add an entry to TYPE_COLORS and drop the def in the room JSON.
 */
export class Pickup {
  readonly gameObject: Phaser.Physics.Arcade.Image
  readonly type: string
  private _collected = false

  get isCollected(): boolean { return this._collected }

  constructor(scene: Phaser.Scene, x: number, y: number, type: string) {
    this.type = type

    const textureKey = `pickup_${type}`

    // Use a pre-loaded sprite if available, otherwise generate a coloured diamond.
    const usedSprite = scene.textures.exists(textureKey)
    if (!usedSprite) {
      const color = TYPE_COLORS[type] ?? TYPE_COLORS['default']
      const size = 20
      const rt = scene.add.renderTexture(0, 0, size, size).setVisible(false)
      const gfx = scene.add.graphics()
      gfx.fillStyle(color, 1)
      gfx.fillTriangle(size / 2, 0, size, size / 2, size / 2, size)
      gfx.fillTriangle(size / 2, 0, 0, size / 2, size / 2, size)
      rt.draw(gfx, 0, 0)
      gfx.destroy()
      rt.saveTexture(textureKey)
      rt.destroy()
    }

    this.gameObject = scene.physics.add.image(x, y, textureKey)
      .setDepth(5)
    ;(this.gameObject.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)

    // Scale pulse only on generated shapes — sprite-based pickups display at natural size
    if (!usedSprite) {
      scene.tweens.add({
        targets: this.gameObject,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: SCALE_PULSE_DURATION,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  /** Call when the player walks over this pickup. Plays collect animation then destroys. */
  collect(onDone?: () => void): void {
    if (this._collected) return
    this._collected = true

    const scene = this.gameObject.scene
    scene.tweens.killTweensOf(this.gameObject)
    ;(this.gameObject.body as Phaser.Physics.Arcade.Body).enable = false

    scene.tweens.add({
      targets: this.gameObject,
      y: this.gameObject.y - 24,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: COLLECT_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.gameObject.destroy()
        onDone?.()
      },
    })
  }
}
