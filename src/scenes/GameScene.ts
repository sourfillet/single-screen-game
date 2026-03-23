import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { DPad } from '../ui/DPad'
import { ROOM_DEFS } from '../data/rooms'

const WALL_THICKNESS = 32
const WALL_COLOR = 0x4a4a6a
const FLOOR_COLOR = 0x1a1a2e
const OBSTACLE_COLOR = 0x7a4010

export class GameScene extends Phaser.Scene {
  private player!: Player
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private dpad!: DPad

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    const room = ROOM_DEFS['start']

    this.buildFloor(room.width, room.height)
    this.buildWalls(room.width, room.height)
    this.buildObstacles(room)

    this.player = new Player(this, room.width / 2, room.height / 2)

    this.physics.add.collider(this.player.gameObject, this.walls)
    this.physics.add.collider(this.player.gameObject, this.obstacles)

    // Camera follows the player — useful once rooms grow larger than the viewport
    this.cameras.main.setBounds(0, 0, room.width, room.height)
    this.cameras.main.startFollow(this.player.gameObject, true, 0.1, 0.1)

    this.dpad = new DPad(this)

    // Enable multi-touch so the d-pad and other inputs can fire simultaneously
    this.input.addPointer(2)
  }

  update(): void {
    this.player.update(this.dpad.state)
  }

  // -------------------------------------------------------------------------
  // Private builders
  // -------------------------------------------------------------------------

  private buildFloor(width: number, height: number): void {
    this.add.rectangle(width / 2, height / 2, width, height, FLOOR_COLOR)
  }

  private buildWalls(width: number, height: number): void {
    this.walls = this.physics.add.staticGroup()
    const t = WALL_THICKNESS

    // top / bottom / left / right border slabs
    const rects: [number, number, number, number][] = [
      [width / 2,     t / 2,          width,  t],      // top
      [width / 2,     height - t / 2, width,  t],      // bottom
      [t / 2,         height / 2,     t,      height], // left
      [width - t / 2, height / 2,     t,      height], // right
    ]

    for (const [x, y, w, h] of rects) {
      this.walls.add(
        this.add.rectangle(x, y, w, h, WALL_COLOR),
      )
    }

    this.walls.refresh()
  }

  private buildObstacles(room: typeof ROOM_DEFS[string]): void {
    this.obstacles = this.physics.add.staticGroup()

    for (const { x, y, w, h, color } of room.obstacles) {
      this.obstacles.add(
        this.add.rectangle(x, y, w, h, color ?? OBSTACLE_COLOR),
      )
    }

    this.obstacles.refresh()
  }
}
