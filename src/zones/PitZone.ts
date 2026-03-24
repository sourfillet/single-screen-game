import Phaser from 'phaser'
import type { Player } from '../entities/Player'

const COLOR        = 0x080808
const EDGE_COLOR   = 0x303030
const EDGE_PADDING = 4

/**
 * Hazard zone that instantly strips one full heart (2 HP) and teleports
 * the player back to the room's spawn point.
 *
 * The player's invincibility frames prevent the pit from landing multiple
 * hits if the respawn point is close to the pit edge.
 */
export class PitZone {
  readonly gameObject: Phaser.GameObjects.Rectangle

  private readonly spawnX: number
  private readonly spawnY: number

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    spawnX: number, spawnY: number,
  ) {
    this.spawnX = spawnX
    this.spawnY = spawnY

    // Outer ring sits exactly on the tile footprint — no overflow into neighbouring tiles
    this.gameObject = scene.add.rectangle(x, y, w, h, EDGE_COLOR)
    scene.physics.add.existing(this.gameObject, true)
    // Dark pit inset so the edge colour shows as a rim around the inside
    scene.add.rectangle(x, y, w - EDGE_PADDING * 2, h - EDGE_PADDING * 2, COLOR)
  }

  /**
   * Returns true only when `body` is entirely contained within the pit.
   * Overlap starts firing as soon as any edge enters — this check ensures
   * the trigger waits until the object has fully crossed in.
   */
  containsFully(body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody): boolean {
    const pit = this.gameObject.body as Phaser.Physics.Arcade.StaticBody
    return (
      body.left   >= pit.left  &&
      body.right  <= pit.right &&
      body.top    >= pit.top   &&
      body.bottom <= pit.bottom
    )
  }

  /** Called each frame the player overlaps this zone. */
  onOverlap(player: Player): void {
    // Teleport first so the player isn't still inside the pit when damage is applied.
    // Iframes from takeDamage then prevent a second hit if they immediately re-overlap.
    player.body.reset(this.spawnX, this.spawnY)

    // 2 HP = 1 full heart
    player.takeDamage(2)
  }
}
