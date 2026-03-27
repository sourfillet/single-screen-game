import Phaser from 'phaser'
import type { Player } from './Player'

// Teal — distinct from every entry in PLAYER_PALETTE
const ENEMY_TINT         = 0x40e0d0
const SCALE              = 2
const PATROL_SPEED       = 55
const CHASE_SPEED        = 110
const DEFAULT_WAKE_RADIUS = 160
// Hysteresis multiplier: enemy goes back to patrol only when player leaves this range
const SLEEP_RADIUS_MULT  = 1.6
// How close (px) the enemy must be to a waypoint before advancing to the next
const WAYPOINT_THRESHOLD = 10

type Facing = 'front' | 'back' | 'right'
type EnemyState = 'patrol' | 'chase'

export class Enemy {
  readonly gameObject: Phaser.Physics.Arcade.Sprite
  readonly flying: boolean

  private state: EnemyState = 'patrol'
  private path: { x: number; y: number }[]
  private pathIndex = 0
  private readonly wakeRadius: number
  private _fallingIn = false
  get fallingIn(): boolean { return this._fallingIn }
  private _dead = false
  get isDead(): boolean { return this._dead }

  /** Set by IceZone each frame. Causes velocity to lerp instead of snap. */
  onIce = false
  private velX = 0
  private velY = 0

  private facing: Facing = 'front'
  private facingFlipX = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    path: { x: number; y: number }[] = [],
    wakeRadius = DEFAULT_WAKE_RADIUS,
    flying = false,
  ) {
    // If no path given, enemy stands in place
    this.path = path.length > 0 ? path : [{ x, y }]
    this.wakeRadius = wakeRadius
    this.flying = flying

    this.gameObject = scene.physics.add.sprite(x, y, 'player_front1')
    this.gameObject.setScale(SCALE)
    this.gameObject.setTint(ENEMY_TINT)
    this.gameObject.setDepth(2)
    // Flying enemies don't interact with solid world bounds either
    this.body.setCollideWorldBounds(!flying)
    // Same hitbox reduction as the player — gives 4 px clearance per side in 1-tile corridors
    this.body.setSize(12, 12)

    this.gameObject.play('idle_front')
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.gameObject.body as Phaser.Physics.Arcade.Body
  }

  update(player: Player): void {
    if (this._fallingIn) return

    const distToPlayer = Phaser.Math.Distance.Between(
      this.gameObject.x, this.gameObject.y,
      player.gameObject.x, player.gameObject.y,
    )

    // Wake up when player enters wake radius; go back to patrol with hysteresis
    if (distToPlayer <= this.wakeRadius) {
      this.state = 'chase'
    } else if (this.state === 'chase' && distToPlayer > this.wakeRadius * SLEEP_RADIUS_MULT) {
      this.state = 'patrol'
    }

    if (this.state === 'chase') {
      this.moveToward(player.gameObject.x, player.gameObject.y, CHASE_SPEED)
    } else {
      this.doPatrol()
    }

    this.applyAnimation()
  }

  /** Kill the enemy (bomb blast, fire, etc.). Plays a burst animation then destroys. */
  kill(): void {
    if (this._fallingIn || this._dead) return
    this._dead = true
    this.body.enable = false
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      scaleX: 2, scaleY: 2,
      alpha: 0,
      duration: 280,
      ease: 'Power2.easeOut',
      onComplete: () => this.gameObject.destroy(),
    })
  }

  /** Called when the enemy fully overlaps a pit zone. Plays a fall animation then destroys. */
  fallIntoPit(): void {
    if (this._fallingIn) return
    this._fallingIn = true
    this.body.enable = false
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => this.gameObject.destroy(),
    })
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private doPatrol(): void {
    if (this.path.length <= 1) {
      this.moveToward(this.gameObject.x, this.gameObject.y, 0)
      return
    }

    const target = this.path[this.pathIndex]
    const dist = Phaser.Math.Distance.Between(
      this.gameObject.x, this.gameObject.y,
      target.x, target.y,
    )

    if (dist < WAYPOINT_THRESHOLD) {
      this.pathIndex = (this.pathIndex + 1) % this.path.length
    }

    this.moveToward(target.x, target.y, PATROL_SPEED)
  }

  private moveToward(tx: number, ty: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.gameObject.x, this.gameObject.y, tx, ty)
    const targetVx = Math.cos(angle) * speed
    const targetVy = Math.sin(angle) * speed
    const t = this.onIce ? 0.08 : 1
    this.velX = Phaser.Math.Linear(this.velX, targetVx, t)
    this.velY = Phaser.Math.Linear(this.velY, targetVy, t)
    this.body.setVelocity(this.velX, this.velY)
    this.updateFacing(this.velX, this.velY)
  }

  private updateFacing(vx: number, vy: number): void {
    const adx = Math.abs(vx)
    const ady = Math.abs(vy)
    if (adx > ady) {
      this.facing = 'right'
      this.facingFlipX = vx < 0
    } else if (vy < 0) {
      this.facing = 'back'
      this.facingFlipX = false
    } else {
      this.facing = 'front'
      this.facingFlipX = false
    }
  }

  private applyAnimation(): void {
    const moving = Math.abs(this.body.velocity.x) > 4 || Math.abs(this.body.velocity.y) > 4
    const nextAnim = moving ? `walk_${this.facing}` : `idle_${this.facing}`

    if (this.gameObject.anims.currentAnim?.key !== nextAnim) {
      this.gameObject.play(nextAnim)
    }
    this.gameObject.setFlipX(this.facingFlipX)
  }
}
