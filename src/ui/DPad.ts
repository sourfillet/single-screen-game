import Phaser from 'phaser'
import type { DPadState } from '../types'


/**
 * On-screen directional pad for touch / mobile input.
 * Rendered in screen space at the bottom-left corner.
 */
export class DPad {
  readonly state: DPadState = { up: false, down: false, left: false, right: false, shield: false, colorCycle: false }

  constructor(_scene: Phaser.Scene) {
    // On-screen buttons hidden — keyboard / touch controls only
  }

}
