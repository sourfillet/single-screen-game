import Phaser from "phaser";

// Match the player's 2× scale so both read as the same visual size
const SCALE = 2;
// How quickly a pushed block bleeds off speed (px/s²)
const PUSH_DRAG = 3600;
// Cap so a shove doesn't send it flying across the room
const MAX_PUSH_VELOCITY = 40;

export class Block {
  readonly gameObject: Phaser.Physics.Arcade.Image;
  readonly pushable: boolean;
  readonly transportable: boolean;
  private fallingIn = false;
  private _carried = false;
  get carried(): boolean {
    return this._carried;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pushable: boolean,
    transportable = false,
  ) {
    this.pushable = pushable;
    this.transportable = transportable;
    this.gameObject = scene.physics.add
      .image(x, y, "block")
      .setScale(SCALE)
      .setDepth(2);

    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

    if (pushable) {
      body.setDrag(PUSH_DRAG, PUSH_DRAG);
      body.setMaxVelocity(MAX_PUSH_VELOCITY, MAX_PUSH_VELOCITY);
      body.setCollideWorldBounds(true);
    } else {
      body.setImmovable(true);
    }
  }

  /** Lift this block; disables physics so it travels with the carrier. */
  pickUp(): void {
    this._carried = true;
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.stop();      // zero velocity before disabling so it doesn't resume on drop
    body.enable = false;
    this.gameObject.setDepth(4);
  }

  /** Place the block at world position (x, y) and re-enable physics. */
  drop(x: number, y: number): void {
    this._carried = false;
    this.gameObject.setPosition(x, y);
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.enable = true;
    this.gameObject.setDepth(2);
  }

  /** Called when the block overlaps a pit zone. Plays a fall animation then destroys. */
  fallIntoPit(): void {
    if (this.fallingIn) return;
    this.fallingIn = true;

    // Disable physics body so colliders and overlaps stop firing immediately
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
