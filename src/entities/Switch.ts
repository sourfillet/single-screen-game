import Phaser from 'phaser'
import { TILE_SIZE } from '../data/rooms'

export type SwitchMode     = 'hold' | 'toggle' | 'one-time'
// 'any'        — player or block
// 'block'      — pushable block only (player alone doesn't count)
// 'item:<type>'— player must be carrying that item type
export type SwitchRequires = 'any' | 'block' | string   // string covers 'item:*'

const BG_COLOR       = 0x444455   // unpressed / enabled background
const BG_DISABLED    = 0x2a2a2a   // background when permanently disabled
const OFF_COLOR      = 0xdd2222   // indicator: inactive
const ON_COLOR       = 0x44ff44   // indicator: active
const DISABLED_COLOR = 0x555555   // indicator: disabled

const INDICATOR_SIZE = TILE_SIZE / 2   // 16 px inset marker

/**
 * A 1×1-tile switch linked to SwitchDoors via a shared `group` string.
 *
 * `mode`:
 *   'hold'     — active only while a qualifying object is standing on it.
 *   'toggle'   — flips state on the rising edge of contact; stays flipped when released.
 *   'one-time' — activates on first press, then permanently disables itself.
 *                The linked doors stay open forever after.
 *
 * `enabled`:
 *   false — switch is permanently inactive; cannot be pressed.
 *           Useful for doors that start open, or as a target state for one-time switches.
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
  private _active      = false
  private _enabled:    boolean
  private _prevPressed = false

  get active():  boolean { return this._active  }
  get enabled(): boolean { return this._enabled }

  constructor(
    scene:    Phaser.Scene,
    x:        number,
    y:        number,
    group:    string,
    mode:     SwitchMode     = 'hold',
    requires: SwitchRequires = 'any',
    enabled  = true,
  ) {
    this.group    = group
    this.mode     = mode
    this.requires = requires
    this._enabled = enabled

    this.gameObject = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, enabled ? BG_COLOR : BG_DISABLED)
    this.gameObject.setDepth(1)
    scene.physics.add.existing(this.gameObject, true)

    this.indicator = scene.add.rectangle(x, y, INDICATOR_SIZE, INDICATOR_SIZE, enabled ? OFF_COLOR : DISABLED_COLOR)
    this.indicator.setDepth(1)
  }

  /**
   * Call once per frame with whether a qualifying object is currently on the switch.
   * Returns true if the `active` state changed this frame.
   * Does nothing when disabled.
   */
  press(pressedNow: boolean): boolean {
    if (!this._enabled) return false

    const wasActive = this._active

    if (this.mode === 'hold') {
      this._active = pressedNow
    } else if (this.mode === 'toggle') {
      if (pressedNow && !this._prevPressed) this._active = !this._active
      this._prevPressed = pressedNow
    } else {
      // one-time: activate on rising edge, then disable permanently
      if (pressedNow && !this._prevPressed && !this._active) {
        this._active  = true
        this._enabled = false
        this._prevPressed = pressedNow
        this.updateVisual()
        return true
      }
      this._prevPressed = pressedNow
    }

    const changed = this._active !== wasActive
    if (changed) this.updateVisual()
    return changed
  }

  private updateVisual(): void {
    if (!this._enabled) {
      // Permanently disabled — grey out and skip the pop animation
      this.gameObject.setFillStyle(BG_DISABLED)
      this.indicator.setFillStyle(this._active ? ON_COLOR : DISABLED_COLOR)
      return
    }
    this.indicator.setFillStyle(this._active ? ON_COLOR : OFF_COLOR)
    this.gameObject.scene.tweens.add({
      targets: this.indicator,
      scaleX: 1.4, scaleY: 1.4,
      duration: 80,
      yoyo: true,
    })
  }
}
