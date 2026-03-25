import Phaser from 'phaser'
import type { DPadState } from '../types'
import { PLAYER_PALETTE } from '../data/palette'

// Canonical facing directions. 'left' is 'right' + flipX — no separate sprites needed.
type Facing = 'front' | 'back' | 'right'

const SPEED = 200
// 16 px source sprites scaled up 2× → 32 px in-world
const SCALE = 2
const WALK_FPS = 6
const SHIELD_FPS = 4
// Milliseconds the player is immune to damage after being hit
const IFRAME_DURATION = 1000

export class Player {
  readonly gameObject: Phaser.Physics.Arcade.Sprite

  private facing: Facing = 'front'
  // Preserved between frames so idle/shield keep facing after player stops
  private facingFlipX = false

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
  private shieldKeys: Phaser.Input.Keyboard.Key[]
  private actionKey: Phaser.Input.Keyboard.Key
  private paletteIndex = 0

  readonly maxHealth: number
  private _health: number
  private invincible = false

  /** Set by IceZone each frame. Causes velocity to lerp instead of snap. */
  onIce = false
  // Persisted velocity used for the lerp so momentum carries between frames
  private velX = 0
  private velY = 0

  private inventory = new Map<string, number>()

  hasItem(type: string): boolean { return (this.inventory.get(type) ?? 0) > 0 }
  getCount(type: string): number  { return this.inventory.get(type) ?? 0 }

  addItem(type: string, count = 1): void {
    this.inventory.set(type, this.getCount(type) + count)
  }

  removeItem(type: string, count = 1): void {
    const next = Math.max(0, this.getCount(type) - count)
    if (next === 0) this.inventory.delete(type)
    else this.inventory.set(type, next)
  }

  constructor(scene: Phaser.Scene, x: number, y: number, tint = 0xffffff, maxHealth = 6) {
    this.maxHealth = maxHealth
    this._health   = maxHealth
    this.gameObject = scene.physics.add.sprite(x, y, 'player_front1')
    this.gameObject.setScale(SCALE)
    this.gameObject.setTint(tint)
    this.gameObject.setDepth(2)
    this.paletteIndex = PLAYER_PALETTE.findIndex(p => p.color === tint)
    if (this.paletteIndex === -1) this.paletteIndex = 0
    this.body.setCollideWorldBounds(true)

    const kb = scene.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    // Shift or Z for shield (keyboard)
    this.shieldKeys = [
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
    ]
    // E to pick up / put down transportable objects
    this.actionKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.registerAnimations(scene)
    this.gameObject.play('idle_front')
  }

  get actionJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.actionKey)
  }

  get facingDir(): { dx: number; dy: number } {
    if (this.facing === 'right') return { dx: this.facingFlipX ? -1 : 1, dy: 0 }
    if (this.facing === 'back')  return { dx: 0, dy: -1 }
    return { dx: 0, dy: 1 }
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.gameObject.body as Phaser.Physics.Arcade.Body
  }

  get health(): number {
    return this._health
  }

  get isDead(): boolean {
    return this._health <= 0
  }

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  /**
   * Reduce health by `amount`. Ignored while invincible or dead.
   * Triggers IFRAME_DURATION ms of invincibility and a flash effect.
   * Returns true if this hit killed the player.
   */
  takeDamage(amount: number): boolean {
    if (this.invincible || this.isDead) return false

    this._health = Math.max(0, this._health - amount)
    this.invincible = true

    // Flash the sprite on/off for the iframe window, then restore
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      alpha: 0,
      duration: 80,
      yoyo: true,
      repeat: Math.floor(IFRAME_DURATION / 160) - 1,
      onComplete: () => {
        this.gameObject.setAlpha(1)
        this.invincible = false
      },
    })

    return this.isDead
  }

  /** Restore health by `amount`, capped at maxHealth. */
  heal(amount: number): void {
    this._health = Math.min(this.maxHealth, this._health + amount)
  }

  /**
   * Plays a death animation then calls `onComplete`.
   * Disables the physics body immediately so the player stops interacting with the world.
   */
  playDeath(onComplete: () => void): void {
    this.gameObject.disableBody(false, false)

    // Kill any in-progress iframe flash so we start from a clean visible state
    this.gameObject.scene.tweens.killTweensOf(this.gameObject)
    this.gameObject.setAlpha(1)
    this.gameObject.setTint(0xff3333)

    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      angle: 360,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 700,
      ease: 'Power2.easeIn',
      onComplete,
    })
  }

  /** Apply an arbitrary tint. Pass 0xffffff to reset to natural sprite colors. */
  setColor(color: number): void {
    this.gameObject.setTint(color)
  }

  /** Step forward through the built-in palette and return the new entry. */
  cycleColor(): { name: string; color: number } {
    this.paletteIndex = (this.paletteIndex + 1) % PLAYER_PALETTE.length
    const entry = PLAYER_PALETTE[this.paletteIndex]
    this.gameObject.setTint(entry.color)
    return entry
  }

  get currentColor(): number {
    return PLAYER_PALETTE[this.paletteIndex].color
  }

  update(dpad: DPadState): void {
    const shielding = dpad.shield || this.shieldKeys.some(k => k.isDown)

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown    || dpad.up
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown  || dpad.down
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown  || dpad.left
    const right = this.cursors.right.isDown || this.wasd.right.isDown || dpad.right

    let vx = 0
    let vy = 0
    if (left)  vx -= SPEED
    if (right) vx += SPEED
    if (up)    vy -= SPEED
    if (down)  vy += SPEED

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071
      vy *= 0.7071
    }

    const moving = vx !== 0 || vy !== 0

    // Update facing from movement; horizontal takes priority over vertical.
    // Only update when actually moving so idle/shield preserve the last direction.
    if (vx !== 0) {
      this.facing = 'right'
      this.facingFlipX = vx < 0
    } else if (vy < 0) {
      this.facing = 'back'
      this.facingFlipX = false
    } else if (vy > 0) {
      this.facing = 'front'
      this.facingFlipX = false
    }

    // On ice: lerp toward the desired velocity so momentum carries; otherwise snap.
    const t = this.onIce ? 0.08 : 1
    this.velX = Phaser.Math.Linear(this.velX, vx, t)
    this.velY = Phaser.Math.Linear(this.velY, vy, t)
    this.body.setVelocity(this.velX, this.velY)
    this.gameObject.setFlipX(this.facingFlipX)

    const nextAnim = shielding
      ? (moving ? `shield_walk_${this.facing}` : `shield_idle_${this.facing}`)
      : (moving ? `walk_${this.facing}`        : `idle_${this.facing}`)

    // Only call play() when the animation actually changes to avoid restart jitter
    if (this.gameObject.anims.currentAnim?.key !== nextAnim) {
      this.gameObject.play(nextAnim)
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private registerAnimations(scene: Phaser.Scene): void {
    // Animations are global to the scene's anims manager — guard against double-registration
    // (e.g. if the scene restarts)
    if (scene.anims.exists('walk_front')) return

    const dirs: Facing[] = ['front', 'back', 'right']

    for (const dir of dirs) {
      scene.anims.create({
        key: `idle_${dir}`,
        frames: [{ key: `player_${dir}1` }],
        frameRate: 1,
        repeat: -1,
      })
      scene.anims.create({
        key: `walk_${dir}`,
        frames: [
          { key: `player_${dir}1` },
          { key: `player_${dir}2` },
        ],
        frameRate: WALK_FPS,
        repeat: -1,
      })
      // Animated shield — only used while walking
      scene.anims.create({
        key: `shield_walk_${dir}`,
        frames: [
          { key: `player_${dir}_shield1` },
          { key: `player_${dir}_shield2` },
        ],
        frameRate: SHIELD_FPS,
        repeat: -1,
      })
      // Static shield — single frame shown while standing
      scene.anims.create({
        key: `shield_idle_${dir}`,
        frames: [{ key: `player_${dir}_shield1` }],
        frameRate: 1,
        repeat: -1,
      })
    }
  }
}
