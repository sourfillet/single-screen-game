import Phaser from "phaser";

// Match the player's 2× scale so both read as the same visual size
const SCALE = 2;
// How quickly a pushed block bleeds off speed (px/s²)
const PUSH_DRAG = 1800;
// Cap so a shove doesn't send it flying across the room
const MAX_PUSH_VELOCITY = 80;

export class Block {
  readonly gameObject: Phaser.Physics.Arcade.Image;
  readonly pushable: boolean;
  private fallingIn = false;

  constructor(scene: Phaser.Scene, x: number, y: number, pushable: boolean) {
    this.pushable = pushable;
    this.gameObject = scene.physics.add.image(x, y, "block").setScale(SCALE).setDepth(2);

    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

    if (pushable) {
      body.setDrag(PUSH_DRAG, PUSH_DRAG);
      body.setMaxVelocity(MAX_PUSH_VELOCITY, MAX_PUSH_VELOCITY);
      body.setCollideWorldBounds(true);
    } else {
      body.setImmovable(true);
    }
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
