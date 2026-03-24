import Phaser from 'phaser'
import { TILE_SIZE } from '../data/rooms'

export type SwitchMode     = 'toggle' | 'hold'
// 'any'        — player or block
// 'block'      — pushable block only (player alone doesn't count)
// 'item:<type>'— player must be carrying that item type
export type SwitchRequires = 'any' | 'block' | string   // string covers 'item:*'

const BG_COLOR  = 0x444455   // unpressed background
const OFF_COLOR = 0x222233   // indicator when inactive
const ON_COLOR  = 0x44ff44   // indicator when active

const INDICATOR_SIZE = TILE_SIZE / 2   // 16 px inset marker

/**
 * A 1×1-tile switch that can be linked to a SwitchDoor via a shared `group` string.
 *
 * `mode`:
 *   'hold'   — active only while a qualifying object is standing on it.
 *   'toggle' — flips state on the rising edge of contact; stays flipped when released.
 *
 * `requires`:
 *   'any'        — player or any pushable block counts.
 *   'block'      — only a pushable block counts (player alone does not activate it).
 *   'item:<type>'— player must have ≥1 of that item in inventory (e.g. 'item:key').
 */
export class Switch {
  readonly gameObject: Phaser.GameObjects.Rectangle   // carries the static physics body
  readonly group:    string
  readonly mode:     SwitchMode
  readonly requires: SwitchRequires

  private indicator: Phaser.GameObjects.Rectangle
  private _active     = false
  private _prevPressed = false

  get active(): boolean { return this._active }

  constructor(
    scene:    Phaser.Scene,
    x:        number,
    y:        number,
    group:    string,
    mode:     SwitchMode     = 'hold',
    requires: SwitchRequires = 'any',
  ) {
    this.group    = group
    this.mode     = mode
    this.requires = requires

    this.gameObject = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, BG_COLOR)
    this.gameObject.setDepth(2)
    scene.physics.add.existing(this.gameObject, true)

    // Smaller inner rectangle whose colour shows the current state
    this.indicator = scene.add.rectangle(x, y, INDICATOR_SIZE, INDICATOR_SIZE, OFF_COLOR)
    this.indicator.setDepth(3)
  }

  /**
   * Call once per frame with whether a qualifying object is currently on the switch.
   * Returns true if the `active` state changed this frame.
   */
  press(pressedNow: boolean): boolean {
    const wasActive = this._active

    if (this.mode === 'hold') {
      this._active = pressedNow
    } else {
      // toggle: flip only on the rising edge (first frame of new contact)
      if (pressedNow && !this._prevPressed) {
        this._active = !this._active
      }
      this._prevPressed = pressedNow
    }

    const changed = this._active !== wasActive
    if (changed) this.updateVisual()
    return changed
  }

  private updateVisual(): void {
    this.indicator.setFillStyle(this._active ? ON_COLOR : OFF_COLOR)
    // Brief scale pop for feedback
    this.gameObject.scene.tweens.add({
      targets: this.indicator,
      scaleX: 1.4, scaleY: 1.4,
      duration: 80,
      yoyo: true,
    })
  }
}
