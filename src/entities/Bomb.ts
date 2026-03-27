import Phaser from 'phaser'

export const BOMB_KEY     = 'bomb_img'
export const BLAST_RADIUS = 80   // px ≈ 2.5 tiles

const FUSE_DURATION = 2500 // ms before explosion
const THROW_SPEED   = 180  // px/s

/** Generate the bomb sprite texture once per scene (no-ops if already registered). */
export function registerBombTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(BOMB_KEY)) return
  const g = scene.make.graphics({ add: false } as never)
  // Body
  g.fillStyle(0x1a1a1a)
  g.fillCircle(11, 12, 9)
  // Highlight
  g.fillStyle(0x555555)
  g.fillCircle(8, 9, 3)
  // Fuse cord
  g.lineStyle(2, 0x8B6914)
  g.beginPath()
  g.moveTo(11, 3)
  g.lineTo(16, -1)
  g.strokePath()
  // Spark at fuse tip
  g.fillStyle(0xffcc00)
  g.fillCircle(16, -1, 2.5)
  g.generateTexture(BOMB_KEY, 24, 24)
  g.destroy()
}

export class Bomb {
  readonly gameObject: Phaser.Physics.Arcade.Image

  _carried = false
  exploded = false

  private fuseTimer  = 0
  private flashTimer = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.gameObject = scene.physics.add.image(x, y, BOMB_KEY).setDepth(2.5)
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body
    body.setDrag(800, 800)
    body.setMaxVelocity(THROW_SPEED, THROW_SPEED)
    body.setCollideWorldBounds(true)
  }

  pickUp(): void {
    this._carried = true
    this.gameObject.setActive(false).setVisible(false)
    ;(this.gameObject.body as Phaser.Physics.Arcade.Body).enable = false
  }

  throw(x: number, y: number, vx: number, vy: number): void {
    this._carried = false
    this.gameObject.setActive(true).setVisible(true)
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body
    body.reset(x, y)
    body.enable = true
    body.setVelocity(vx, vy)
  }

  /** Call each frame. Invokes `onExplode` once when the fuse runs out. */
  update(delta: number, onExplode: (x: number, y: number) => void): void {
    if (this._carried || this.exploded) return

    this.fuseTimer  += delta
    this.flashTimer += delta

    // Blink faster in final 40 % of fuse
    const flashRate  = this.fuseTimer > FUSE_DURATION * 0.6 ? 100 : 280
    const flashPhase = Math.floor(this.flashTimer / flashRate) % 2
    this.gameObject.setTint(flashPhase === 0 ? 0xffffff : 0xff3300)

    if (this.fuseTimer >= FUSE_DURATION) {
      this.exploded = true
      onExplode(this.gameObject.x, this.gameObject.y)
    }
  }
}
