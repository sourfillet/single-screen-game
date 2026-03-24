import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { DPad } from "../ui/DPad";
import { HealthBar } from "../ui/HealthBar";
import { DeathScreen } from "../ui/DeathScreen";
import { DamageZone } from "../zones/DamageZone";
import { PitZone } from "../zones/PitZone";
import { IceZone } from "../zones/IceZone";
import { HealZone } from "../zones/HealZone";
import { DirectionalZone } from "../zones/DirectionalZone";
import { TeleporterZone } from "../zones/TeleporterZone";
import { ExitZone } from "../zones/ExitZone";
import { Pickup } from "../entities/Pickup";
import { LockedDoor } from "../entities/LockedDoor";
import { ExitScreen } from "../ui/ExitScreen";
import { Switch } from "../entities/Switch";
import { SwitchDoor } from "../entities/SwitchDoor";
import { ROOM_DEFS, TILE_SIZE } from "../data/rooms";
import { Block } from "../entities/Block";
import { PLAYER_SPRITE_URLS } from "../assets/playerSprites";
import { BLOCK_SPRITE_URLS } from "../assets/blockSprites";
import { stripBackground } from "../utils/textureUtils";
import { FLOOR_TILE_KEY, FLOOR_TILE_URL } from "../assets/floorTile";

const WALL_THICKNESS = 1 * TILE_SIZE; // 1-tile-thick border walls (= one sprite width)
const WALL_COLOR = 0x4a4a6a;

const OBSTACLE_COLOR = 0x7a4010;

// Tile-to-pixel helpers.
// Areas  (obstacles, zones): x,y = top-left tile; w,h = tile dimensions.
// Entities (blocks, enemies, spawn): x,y = tile column/row.
const areaW = (w: number) => w * TILE_SIZE;
const areaH = (h: number) => h * TILE_SIZE;
const areaPx = (corner: number, size: number) =>
  (corner + size / 2) * TILE_SIZE;
const entPx = (tile: number) => (tile + 0.5) * TILE_SIZE;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private blocks: Block[] = [];
  private fixedBlockObjects: Phaser.Physics.Arcade.Image[] = [];
  private pushableBlockObjects: Phaser.Physics.Arcade.Image[] = [];
  private damageZones: DamageZone[] = [];
  private pitZones: PitZone[] = [];
  private iceZones: IceZone[] = [];
  private healZones: HealZone[] = [];
  private directionalZones: DirectionalZone[] = [];
  private teleporterZones: TeleporterZone[] = [];
  private exitZones: ExitZone[] = [];
  private pickups: Pickup[] = [];
  private lockedDoors: LockedDoor[] = [];
  private switches: Switch[] = [];
  private switchDoors: SwitchDoor[] = [];
  private keyCountText!: Phaser.GameObjects.Text;
  private enemies: Enemy[] = [];
  private gameOver = false;
  private dpad!: DPad;
  private healthBar!: HealthBar;
  private colorLabel!: Phaser.GameObjects.Text;
  private colorKey!: Phaser.Input.Keyboard.Key;
  private damageTestKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    for (const [key, url] of Object.entries(PLAYER_SPRITE_URLS)) {
      this.load.image(key, url);
    }
    // Block sprites fill the full frame — loaded separately, no stripBackground applied
    for (const [key, url] of Object.entries(BLOCK_SPRITE_URLS)) {
      this.load.image(key, url);
    }
    this.load.image(FLOOR_TILE_KEY, FLOOR_TILE_URL);
  }

  create(): void {
    this.gameOver = false;

    for (const key of Object.keys(PLAYER_SPRITE_URLS)) {
      stripBackground(this, key);
    }

    const room = ROOM_DEFS["test"];

    const roomW = room.width * TILE_SIZE;
    const roomH = room.height * TILE_SIZE;
    const spawnX = entPx(room.spawnX ?? room.width / 2);
    const spawnY = entPx(room.spawnY ?? room.height / 2);

    this.buildFloor(roomW, roomH);
    this.buildWalls(roomW, roomH);
    this.buildObstacles(room);
    this.buildZones(room, spawnX, spawnY);
    this.buildBlocks(room);
    this.buildPickups(room);
    this.buildLockedDoors(room);
    this.buildSwitches(room);
    this.buildEnemies(room);

    this.cameras.main.setBounds(0, 0, roomW, roomH);
    this.player = new Player(this, spawnX, spawnY);

    this.physics.add.collider(this.player.gameObject, this.walls);
    this.physics.add.collider(this.player.gameObject, this.obstacles);

    // Player collides with all blocks
    for (const block of this.blocks) {
      this.physics.add.collider(this.player.gameObject, block.gameObject);
    }

    // Pushable blocks collide with the environment and each other
    const pushable = this.blocks
      .filter((b) => b.pushable)
      .map((b) => b.gameObject);
    const fixed = this.blocks
      .filter((b) => !b.pushable)
      .map((b) => b.gameObject);
    if (pushable.length > 0) {
      this.physics.add.collider(pushable, this.walls);
      this.physics.add.collider(pushable, this.obstacles);
      if (pushable.length > 1) this.physics.add.collider(pushable, pushable);
      if (fixed.length > 0) this.physics.add.collider(pushable, fixed);
    }

    for (const enemy of this.enemies) {
      if (!enemy.flying) {
        this.physics.add.collider(enemy.gameObject, this.walls);
        this.physics.add.collider(enemy.gameObject, this.obstacles);
        for (const block of this.blocks) {
          this.physics.add.collider(enemy.gameObject, block.gameObject);
        }
      }
      this.physics.add.overlap(this.player.gameObject, enemy.gameObject, () => {
        this.player.takeDamage(1);
      });
    }

    for (const zone of this.damageZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        zone.onOverlap(this.player, this.time.now);
      });
    }
    for (const zone of this.healZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        zone.onOverlap(this.player, this.time.now);
      });
    }
    for (const teleporter of this.teleporterZones) {
      this.physics.add.overlap(
        this.player.gameObject,
        teleporter.gameObject,
        () => {
          if (!teleporter.canTeleport(this.time.now)) return;
          const group = this.teleporterZones.filter(
            (t) => t.group === teleporter.group,
          );
          const dest = group[(group.indexOf(teleporter) + 1) % group.length];
          this.player.body.reset(dest.gameObject.x, dest.gameObject.y);
          teleporter.markUsed(this.time.now);
          dest.markUsed(this.time.now);
        },
      );
    }
    for (const zone of this.pitZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        if (zone.containsFully(this.player.body)) zone.onOverlap(this.player);
      });
      for (const block of this.blocks.filter((b) => b.pushable)) {
        this.physics.add.overlap(block.gameObject, zone.gameObject, () => {
          if (
            zone.containsFully(
              block.gameObject.body as Phaser.Physics.Arcade.Body,
            )
          ) {
            block.fallIntoPit();
          }
        });
      }
      for (const enemy of this.enemies.filter((e) => !e.flying)) {
        this.physics.add.overlap(enemy.gameObject, zone.gameObject, () => {
          if (
            zone.containsFully(
              enemy.gameObject.body as Phaser.Physics.Arcade.Body,
            )
          ) {
            enemy.fallIntoPit();
          }
        });
      }
    }

    this.cameras.main.startFollow(this.player.gameObject, true, 0.1, 0.1);

    this.dpad = new DPad(this);

    // Enable multi-touch so the d-pad and other inputs can fire simultaneously
    this.input.addPointer(2);

    // Color cycling — C key on keyboard, CLR button on mobile DPad
    this.colorKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.C,
    );
    this.colorLabel = this.add
      .text(this.scale.width - 8, 8, "", { fontSize: "12px", color: "#ffffff" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20);

    this.healthBar = new HealthBar(this, this.player);

    // Pickup overlaps — collect on first touch
    for (const pickup of this.pickups) {
      this.physics.add.overlap(this.player.gameObject, pickup.gameObject, () => {
        if (pickup.isCollected) return;
        pickup.collect(() => {
          this.player.addItem(pickup.type);
          this.updateKeyHud();
        });
      });
    }

    // Locked door — collide normally; open when player touches it with the key
    for (const door of this.lockedDoors) {
      this.physics.add.collider(this.player.gameObject, door.gameObject, () => {
        if (!door.isOpen && this.player.hasItem(door.requires)) {
          this.player.removeItem(door.requires);
          this.updateKeyHud();
          door.open();
        }
      });
    }

    // Switch doors — collide with player and pushable blocks
    for (const door of this.switchDoors) {
      this.physics.add.collider(this.player.gameObject, door.gameObject);
      for (const block of this.blocks.filter((b) => b.pushable)) {
        this.physics.add.collider(block.gameObject, door.gameObject);
      }
    }

    // Exit zone
    for (const zone of this.exitZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        if (!this.gameOver) this.handleExit();
      });
    }

    // Key count HUD — bottom-left, fixed to camera
    this.keyCountText = this.add
      .text(8, this.scale.height - 8, '', { fontSize: '14px', color: '#f0c040' })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(20);

    // H key deals 1 damage — useful for testing before enemies exist
    this.damageTestKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.H,
    );
  }

  update(): void {
    if (this.gameOver) return;

    this.icePass();
    this.switchPass();
    this.player.update(this.dpad.state);
    for (const enemy of this.enemies) enemy.update(this.player);
    this.directionalPass();
    this.solidityPass();
    this.healthBar.update(this.player);

    if (this.player.isDead) {
      this.handleDeath();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.colorKey) ||
      this.dpad.state.colorCycle
    ) {
      const entry = this.player.cycleColor();
      this.colorLabel.setText(entry.name);
      this.tweens.add({
        targets: this.colorLabel,
        alpha: { from: 1, to: 0 },
        delay: 800,
        duration: 400,
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.damageTestKey)) {
      this.player.takeDamage(1);
    }
  }

  private handleExit(): void {
    this.gameOver = true;
    new ExitScreen(this, () => this.scene.restart());
  }

  private updateKeyHud(): void {
    const count = this.player.getCount('key');
    this.keyCountText.setText(count > 0 ? `Key ×${count}` : '');
  }

  private handleDeath(): void {
    this.gameOver = true;
    this.player.playDeath(() => {
      new DeathScreen(this, () => this.scene.restart());
    });
  }

  // -------------------------------------------------------------------------
  // Private builders
  // -------------------------------------------------------------------------

  /**
   * Second collision-resolution pass, run after the physics step's automatic pass.
   * Phaser resolves collisions pair-by-pair; a second pass catches residual overlaps
   * that occur when the player or a block is simultaneously touching multiple solids
   * (e.g. a wall corner and an obstacle). Applies equally to all solid objects.
   */
  private solidityPass(): void {
    const p = this.player.gameObject;
    this.physics.world.collide(p, this.walls);
    this.physics.world.collide(p, this.obstacles);
    for (const go of this.fixedBlockObjects) {
      if (go.active) this.physics.world.collide(p, go);
    }
    for (const go of this.pushableBlockObjects) {
      if (!go.active) continue;
      this.physics.world.collide(go, this.walls);
      this.physics.world.collide(go, this.obstacles);
    }
  }

  private buildFloor(width: number, height: number): void {
    this.add.tileSprite(width / 2, height / 2, width, height, FLOOR_TILE_KEY);
  }

  private buildWalls(width: number, height: number): void {
    this.walls = this.physics.add.staticGroup();
    const t = WALL_THICKNESS;

    // top / bottom / left / right border slabs
    const rects: [number, number, number, number][] = [
      [width / 2, t / 2, width, t], // top
      [width / 2, height - t / 2, width, t], // bottom
      [t / 2, height / 2, t, height], // left
      [width - t / 2, height / 2, t, height], // right
    ];

    for (const [x, y, w, h] of rects) {
      this.walls.add(this.add.rectangle(x, y, w, h, WALL_COLOR));
    }

    this.walls.refresh();
  }

  private buildObstacles(room: (typeof ROOM_DEFS)[string]): void {
    this.obstacles = this.physics.add.staticGroup();

    for (const { x, y, w, h, color } of room.obstacles ?? []) {
      this.obstacles.add(
        this.add.rectangle(
          areaPx(x, w),
          areaPx(y, h),
          areaW(w),
          areaH(h),
          color ?? OBSTACLE_COLOR,
        ),
      );
    }

    this.obstacles.refresh();
  }

  private buildBlocks(room: (typeof ROOM_DEFS)[string]): void {
    this.blocks = [];
    this.fixedBlockObjects = [];
    this.pushableBlockObjects = [];
    for (const { x, y, pushable } of room.blocks ?? []) {
      // Blocks are 1×1 tile (32×32 px) — entity convention, centred within their tile
      const block = new Block(this, entPx(x), entPx(y), pushable);
      this.blocks.push(block);
      if (pushable) this.pushableBlockObjects.push(block.gameObject);
      else this.fixedBlockObjects.push(block.gameObject);
    }
  }

  /**
   * Checks each ice zone and sets the `onIce` flag on every affected entity.
   * Must run before entity update() calls so the lerp factor is correct this frame.
   * Also adjusts pushable block drag so blocks slide on ice.
   */
  private icePass(): void {
    const ICE_BLOCK_DRAG = 300;
    const NORMAL_BLOCK_DRAG = 1800;

    let playerOnIce = false;
    const enemyOnIce = new Array(this.enemies.length).fill(false);

    for (const zone of this.iceZones) {
      if (this.physics.world.overlap(this.player.gameObject, zone.gameObject)) {
        playerOnIce = true;
      }
      for (let i = 0; i < this.enemies.length; i++) {
        if (
          !this.enemies[i].fallingIn &&
          this.physics.world.overlap(
            this.enemies[i].gameObject,
            zone.gameObject,
          )
        ) {
          enemyOnIce[i] = true;
        }
      }
    }

    this.player.onIce = playerOnIce;
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].onIce = enemyOnIce[i];
    }

    for (const block of this.blocks.filter((b) => b.pushable)) {
      if (!block.gameObject.active) continue;
      let onIce = false;
      for (const zone of this.iceZones) {
        if (this.physics.world.overlap(block.gameObject, zone.gameObject)) {
          onIce = true;
          break;
        }
      }
      const drag = onIce ? ICE_BLOCK_DRAG : NORMAL_BLOCK_DRAG;
      (block.gameObject.body as Phaser.Physics.Arcade.Body).setDrag(drag, drag);
    }
  }

  /**
   * Overrides entity velocity for any entity inside a directional zone.
   * Runs after entity update() so it takes precedence over normal movement.
   */
  private directionalPass(): void {
    for (const zone of this.directionalZones) {
      if (this.physics.world.overlap(this.player.gameObject, zone.gameObject)) {
        this.player.body.setVelocity(zone.vx, zone.vy);
      }
      for (const enemy of this.enemies) {
        if (
          !enemy.fallingIn &&
          this.physics.world.overlap(enemy.gameObject, zone.gameObject)
        ) {
          enemy.body.setVelocity(zone.vx, zone.vy);
        }
      }
    }
  }

  private buildSwitches(room: (typeof ROOM_DEFS)[string]): void {
    this.switches = [];
    this.switchDoors = [];

    for (const { x, y, w, h, group } of room.switchDoors ?? []) {
      this.switchDoors.push(
        new SwitchDoor(this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h), group),
      );
    }
    for (const { x, y, group, mode, requires } of room.switches ?? []) {
      this.switches.push(
        new Switch(this, entPx(x), entPx(y), group, mode, requires),
      );
    }
  }

  /**
   * Evaluates every switch each frame and opens/closes linked doors accordingly.
   * A door opens when ANY switch in its group is active (OR logic).
   */
  private switchPass(): void {
    const pushableBlocks = this.blocks.filter(
      (b) => b.pushable && b.gameObject.active,
    );

    for (const sw of this.switches) {
      const req = sw.requires ?? 'any';
      let pressedNow = false;

      // Player counts unless requires is 'block'
      if (req !== 'block') {
        const itemType = req.startsWith('item:') ? req.slice(5) : null;
        const playerQualifies = itemType
          ? this.player.hasItem(itemType)
          : true;
        if (
          playerQualifies &&
          this.physics.world.overlap(this.player.gameObject, sw.gameObject)
        ) {
          pressedNow = true;
        }
      }

      // Pushable blocks always count for 'any' and 'block'
      if (!pressedNow && req !== 'item' && !req.startsWith('item:')) {
        for (const block of pushableBlocks) {
          if (this.physics.world.overlap(block.gameObject, sw.gameObject)) {
            pressedNow = true;
            break;
          }
        }
      }

      const changed = sw.press(pressedNow);
      if (changed) {
        const anyActive = this.switches.some(
          (s) => s.group === sw.group && s.active,
        );
        for (const door of this.switchDoors.filter(
          (d) => d.group === sw.group,
        )) {
          door.setOpen(anyActive);
        }
      }
    }
  }

  private buildPickups(room: (typeof ROOM_DEFS)[string]): void {
    this.pickups = [];
    for (const { type, x, y } of room.pickups ?? []) {
      this.pickups.push(new Pickup(this, entPx(x), entPx(y), type));
    }
  }

  private buildLockedDoors(room: (typeof ROOM_DEFS)[string]): void {
    this.lockedDoors = [];
    for (const { requires, x, y, w, h } of room.lockedDoors ?? []) {
      this.lockedDoors.push(
        new LockedDoor(this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h), requires),
      );
    }
  }

  private buildEnemies(room: (typeof ROOM_DEFS)[string]): void {
    this.enemies = [];
    for (const { x, y, path, wakeRadius, flying } of room.enemies ?? []) {
      const pixelPath = path?.map((p) => ({ x: entPx(p.x), y: entPx(p.y) }));
      this.enemies.push(
        new Enemy(this, entPx(x), entPx(y), pixelPath, wakeRadius, flying),
      );
    }
  }

  private buildZones(
    room: (typeof ROOM_DEFS)[string],
    spawnX: number,
    spawnY: number,
  ): void {
    this.damageZones = [];
    this.pitZones = [];
    this.iceZones = [];
    this.healZones = [];
    this.directionalZones = [];
    this.teleporterZones = [];
    this.exitZones = [];

    // Track first-seen order of teleporter groups so paired zones share a colour
    const groupColorIndex = new Map<string, number>();

    for (const zoneDef of room.zones ?? []) {
      const { type, x, y, w, h } = zoneDef;
      switch (type) {
        case "damage":
          this.damageZones.push(
            new DamageZone(
              this,
              areaPx(x, w),
              areaPx(y, h),
              areaW(w),
              areaH(h),
            ),
          );
          break;
        case "pit":
          this.pitZones.push(
            new PitZone(
              this,
              areaPx(x, w),
              areaPx(y, h),
              areaW(w),
              areaH(h),
              spawnX,
              spawnY,
            ),
          );
          break;
        case "ice":
          this.iceZones.push(
            new IceZone(this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h)),
          );
          break;
        case "heal":
          this.healZones.push(
            new HealZone(this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h)),
          );
          break;
        case "directional":
          this.directionalZones.push(
            new DirectionalZone(
              this,
              areaPx(x, w),
              areaPx(y, h),
              areaW(w),
              areaH(h),
              zoneDef.direction ?? "right",
              zoneDef.speed,
            ),
          );
          break;
        case "teleporter": {
          const group = zoneDef.group ?? "default";
          if (!groupColorIndex.has(group))
            groupColorIndex.set(group, groupColorIndex.size);
          this.teleporterZones.push(
            new TeleporterZone(
              this,
              areaPx(x, w),
              areaPx(y, h),
              areaW(w),
              areaH(h),
              group,
              groupColorIndex.get(group)!,
            ),
          );
          break;
        }
        case "exit":
          this.exitZones.push(
            new ExitZone(this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h)),
          );
          break;
      }
    }
  }
}
