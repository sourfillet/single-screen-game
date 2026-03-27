import Phaser from "phaser";
import { TELEPORTER_ANIM } from "../assets/teleporterSprites";

// One colour per group index so paired teleporters share a colour
const GROUP_COLORS = [0xcc44ff, 0xff44aa, 0x44ccff, 0xffcc22, 0x44ffaa];
const SCALE = 0.8;

/**
 * A pad that teleports entities to a destination zone.
 *
 * active = true  → can send AND receive.
 * active = false → receive-only (appears dimmer).
 *
 * destination routing (resolved by GameScene):
 *   specific id  → always sends to that zone
 *   "random"     → randomly picks from the same group (excluding self)
 *   omitted      → cycles to the next zone in the group
 */
export class TeleporterZone {
  readonly gameObject: Phaser.GameObjects.Rectangle;
  readonly group: string;
  readonly id: string;
  readonly destination: string;
  readonly active: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    group: string,
    groupIndex: number,
    id = "",
    destination = "",
    active = true,
  ) {
    this.group = group;
    this.id = id;
    this.destination = destination;
    this.active = active;

    const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length];

    // Invisible physics body covering the full zone area
    this.gameObject = scene.add.rectangle(x, y, w, h, 0, 0).setDepth(1);
    scene.physics.add.existing(this.gameObject, true);

    // Animated sprite centred in the zone, tinted to the group colour.
    // Inactive pads are dimmed to signal receive-only status.
    const sprite = scene.add.sprite(x, y, "teleporter1");
    sprite.setScale(SCALE);
    sprite.setTint(color);
    sprite.setAlpha(active ? 1 : 0.4);
    sprite.setDepth(1);
    sprite.play(TELEPORTER_ANIM);
  }
}
