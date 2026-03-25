import Phaser from "phaser";
import { POT_KEY, POT_BREAK_ANIM } from "../assets/potSprites";

const SCALE = 1;
const THROW_SPEED = 220; // px/s — constant velocity while airborne

export class Pot {
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private _carried = false;
  private _thrown = false;
  private _broken = false;

  get carried(): boolean {
    return this._carried;
  }
  get thrown(): boolean {
    return this._thrown;
  }
  get broken(): boolean {
    return this._broken;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.gameObject = scene.physics.add
      .sprite(x, y, POT_KEY)
      .setScale(SCALE)
      .setDepth(2);

    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    // Resting pots are immovable — players and enemies push against them,
    // but they won't slide. Immovability is lifted when thrown.
    body.setImmovable(true);
    body.setCollideWorldBounds(true);
  }

  /** Lift the pot; disables physics so it travels with the carrier. */
  pickUp(): void {
    this._carried = true;
    this._thrown = false;
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.stop();
    body.enable = false;
    this.gameObject.setDepth(4);
  }

  /**
   * Launch the pot from world position (x, y) with velocity (vx, vy).
   * Drag is zeroed so it maintains speed until hitting something.
   */
  throw(x: number, y: number, vx: number, vy: number): void {
    this._carried = false;
    this._thrown = true;
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    body.setDrag(0, 0);
    body.setMaxVelocity(THROW_SPEED, THROW_SPEED);
    body.reset(x, y);
    body.enable = true;
    body.setVelocity(vx, vy);
    this.gameObject.setDepth(4);
  }

  /**
   * Play the break animation. Safe to call multiple times — only runs once.
   * Disables physics immediately so it stops interacting with the world,
   * then destroys itself when the animation ends.
   */
  break(): void {
    if (this._broken) return;
    this._broken = true;
    this._thrown = false;
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.stop();
    body.enable = false;
    this.gameObject.setDepth(3);
    this.gameObject.play(POT_BREAK_ANIM);
    this.gameObject.once("animationcomplete", () => this.gameObject.destroy());
  }

  /** Called when the pot fully enters a pit zone. */
  fallIntoPit(): void {
    if (this._broken) return;
    this._broken = true;
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: "Power2.easeIn",
      onComplete: () => this.gameObject.destroy(),
    });
  }
}
