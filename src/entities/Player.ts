import Phaser from 'phaser'
import type { DPadState } from '../types'

const PLAYER_SPEED = 200
const PLAYER_SIZE = 24
const PLAYER_COLOR = 0x00ccff

export class Player {
  readonly gameObject: Phaser.GameObjects.Rectangle

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.gameObject = scene.add.rectangle(x, y, PLAYER_SIZE, PLAYER_SIZE, PLAYER_COLOR)
    scene.physics.add.existing(this.gameObject)

    const body = this.body
    body.setCollideWorldBounds(true)

    const kb = scene.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.gameObject.body as Phaser.Physics.Arcade.Body
  }

  update(dpad: DPadState): void {
    const up = this.cursors.up.isDown || this.wasd.up.isDown || dpad.up
    const down = this.cursors.down.isDown || this.wasd.down.isDown || dpad.down
    const left = this.cursors.left.isDown || this.wasd.left.isDown || dpad.left
    const right = this.cursors.right.isDown || this.wasd.right.isDown || dpad.right

    let vx = 0
    let vy = 0
    if (left) vx -= PLAYER_SPEED
    if (right) vx += PLAYER_SPEED
    if (up) vy -= PLAYER_SPEED
    if (down) vy += PLAYER_SPEED

    // Normalize diagonal movement so diagonal isn't faster
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071
      vy *= 0.7071
    }

    this.body.setVelocity(vx, vy)
  }
}
