import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { DPad } from "../ui/DPad";
import { HealthBar, HEART_FULL_KEY, HEART_FULL_URL, HEART_HALF_KEY, HEART_HALF_URL } from "../ui/HealthBar";
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
import { LockedBlock } from "../entities/LockedBlock";
import { Pot } from "../entities/Pot";
import { POT_SPRITE_URLS, POT_BREAK_KEYS, POT_BREAK_ANIM } from "../assets/potSprites";
import { TELEPORTER_SPRITE_URLS, TELEPORTER_FRAME_KEYS, TELEPORTER_ANIM } from "../assets/teleporterSprites";
import { DIRECTIONAL_PAD_KEY, DIRECTIONAL_PAD_URL } from "../assets/directionalPadSprites";
import { PLAYER_SPRITE_URLS } from "../assets/playerSprites";
import { BLOCK_SPRITE_URLS } from "../assets/blockSprites";
import { stripBackground } from "../utils/textureUtils";
import { FLOOR_TILE_KEY, FLOOR_TILE_URL } from "../assets/floorTile";
import { BRICK_TILE_KEY, BRICK_TILE_URL } from "../assets/brickTile";
import { TILE_PALETTE_URLS } from "../assets/tilePalette";
import keyUrl from "../sprites/key.png";
import { Bomb, registerBombTexture, BLAST_RADIUS } from "../entities/Bomb";
import { Fire } from "../entities/Fire";

const WALL_THICKNESS = 1 * TILE_SIZE; // 1-tile-thick border walls (= one sprite width)

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
  /** Pads whose centre currently contains the player — prevents re-teleport until the player leaves. */
  private playerOnTeleporters = new Set<TeleporterZone>();
  /** True when a directional zone is actively pushing the player this frame. */
  private playerOnDirectional = false;
  private exitZones: ExitZone[] = [];
  private pickups: Pickup[] = [];
  private lockedDoors: LockedDoor[] = [];
  private lockedBlocks: LockedBlock[] = [];
  private switches: Switch[] = [];
  private switchDoors: SwitchDoor[] = [];
  private pots: Pot[] = [];
  private carriedBlock: Block | null = null;
  private carriedPot: Pot | null = null;
  private keyCountText!: Phaser.GameObjects.Text;
  private enemies: Enemy[] = [];
  private gameOver = false;
  // ── Bombs ──────────────────────────────────────────────────────────────
  private bombs: Bomb[] = [];
  private carriedBomb: Bomb | null = null;
  // ── Fire ───────────────────────────────────────────────────────────────
  private fires: Fire[] = [];
  private flammableRects: Phaser.Geom.Rectangle[] = [];
  // ── Burning state (managed externally to avoid modifying entity classes) ─
  private playerBurning = false;
  private playerBurnTimer = 0;
  private playerBurnDmgTimer = 0;
  private enemyBurning: boolean[] = [];
  private enemyBurnTimers: number[] = [];
  private enemyBurnDmgTimers: number[] = [];
  // ── Torch key ─────────────────────────────────────────────────────────
  private torchKey!: Phaser.Input.Keyboard.Key;
  private topTileObjects: Array<{
    sprite: Phaser.GameObjects.Image;
    col: number;
    row: number;
    hiddenPickup?: string;
  }> = [];
  private roomW = 0;
  private roomH = 0;
  private dpad!: DPad;
  private healthBar!: HealthBar;
  private colorLabel!: Phaser.GameObjects.Text;
  private colorKey!: Phaser.Input.Keyboard.Key;
  private damageTestKey!: Phaser.Input.Keyboard.Key;
  private resetKey!: Phaser.Input.Keyboard.Key;

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
    this.load.image('pickup_key', keyUrl);
    this.load.image(FLOOR_TILE_KEY, FLOOR_TILE_URL);
    this.load.image(BRICK_TILE_KEY, BRICK_TILE_URL);
    this.load.image(HEART_FULL_KEY, HEART_FULL_URL);
    this.load.image(HEART_HALF_KEY, HEART_HALF_URL);
    for (const [key, url] of Object.entries(POT_SPRITE_URLS)) {
      this.load.image(key, url);
    }
    for (const [key, url] of Object.entries(TELEPORTER_SPRITE_URLS)) {
      this.load.image(key, url);
    }
    this.load.image(DIRECTIONAL_PAD_KEY, DIRECTIONAL_PAD_URL);
    for (const [key, url] of Object.entries(TILE_PALETTE_URLS)) {
      this.load.image(key, url);
    }
    registerBombTexture(this);
  }

  create(): void {
    this.gameOver = false;

    this.anims.create({
      key: TELEPORTER_ANIM,
      frames: TELEPORTER_FRAME_KEYS.map((key) => ({ key })),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: POT_BREAK_ANIM,
      frames: POT_BREAK_KEYS.map((key) => ({ key })),
      frameRate: 12,
      repeat: 0,
    });

    for (const key of Object.keys(PLAYER_SPRITE_URLS)) {
      stripBackground(this, key);
    }

    const _urlRoom   = this.registry.get('urlRoom') ?? null;
    const _preview   = localStorage.getItem('editorPreviewRoom');
    const room: (typeof ROOM_DEFS)[string] = _urlRoom
      ?? (_preview ? JSON.parse(_preview) : ROOM_DEFS["test"]);

    const roomW = room.width * TILE_SIZE;
    const roomH = room.height * TILE_SIZE;
    this.roomW = roomW;
    this.roomH = roomH;
    const spawnOverride = this.registry.get('spawnOverride') as { x?: number; y?: number } | null;
    this.registry.remove('spawnOverride');
    const spawnX = entPx(spawnOverride?.x ?? room.spawnX ?? room.width / 2);
    const spawnY = entPx(spawnOverride?.y ?? room.spawnY ?? room.height / 2);

    this.buildFloor(roomW, roomH);
    this.buildBaseTiles(room);
    this.buildTopTiles(room);
    this.buildWalls(roomW, roomH);
    this.buildObstacles(room);
    this.buildZones(room, spawnX, spawnY);
    this.buildBlocks(room);
    this.buildPickups(room);
    this.buildLockedDoors(room);
    this.buildLockedBlocks(room);
    this.buildSwitches(room);
    this.buildPots(room);
    this.buildEnemies(room);

    this.physics.world.setBounds(0, 0, roomW, roomH);
    this.player = new Player(this, spawnX, spawnY);

    // Restore inventory saved during a room transition
    const savedInventory = this.registry.get('savedInventory') as Record<string, number> | null;
    if (savedInventory) {
      for (const [item, count] of Object.entries(savedInventory)) {
        this.player.addItem(item, count);
      }
      this.registry.remove('savedInventory');
    }

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
    for (const zone of this.pitZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        if (zone.containsFully(this.player.body) || this.playerOnDirectional) zone.onOverlap(this.player);
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

    this.updateCamera(true);

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
          // Torch: also ignite the tile it was sitting on
          if (pickup.type === 'torch') {
            const col = Math.floor(pickup.gameObject.x / TILE_SIZE);
            const row = Math.floor(pickup.gameObject.y / TILE_SIZE);
            this.igniteBFS(col, row);
          }
        });
      });
    }

    // Initialise per-enemy burning arrays to match enemies list
    this.enemyBurning    = this.enemies.map(() => false);
    this.enemyBurnTimers = this.enemies.map(() => 0);
    this.enemyBurnDmgTimers = this.enemies.map(() => 0);

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

    // Locked blocks — same logic as locked doors but entity-sized
    for (const lb of this.lockedBlocks) {
      this.physics.add.collider(this.player.gameObject, lb.gameObject, () => {
        if (!lb.isOpen && this.player.hasItem(lb.requires)) {
          this.player.removeItem(lb.requires);
          this.updateKeyHud();
          lb.open();
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

    // Pots — player/enemy/block collision; break callbacks fire only when thrown
    for (const pot of this.pots) {
      this.physics.add.collider(this.player.gameObject, pot.gameObject);
      this.physics.add.collider(pot.gameObject, this.walls,     () => { if (pot.thrown) pot.break(); });
      this.physics.add.collider(pot.gameObject, this.obstacles, () => { if (pot.thrown) pot.break(); });
      for (const block of this.blocks) {
        this.physics.add.collider(pot.gameObject, block.gameObject, () => { if (pot.thrown) pot.break(); });
      }
      for (const other of this.pots) {
        if (other === pot) continue;
        this.physics.add.collider(pot.gameObject, other.gameObject, () => {
          if (pot.thrown || other.thrown) { pot.break(); other.break(); }
        });
      }
      for (const zone of this.pitZones) {
        this.physics.add.overlap(pot.gameObject, zone.gameObject, () => {
          if (zone.containsFully(pot.gameObject.body as Phaser.Physics.Arcade.Body)) pot.fallIntoPit();
        });
      }
      for (const door of this.switchDoors) {
        this.physics.add.collider(pot.gameObject, door.gameObject, () => { if (pot.thrown) pot.break(); });
      }
    }

    // Exit zone
    for (const zone of this.exitZones) {
      this.physics.add.overlap(this.player.gameObject, zone.gameObject, () => {
        if (!this.gameOver) this.handleExit(zone);
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

    this.resetKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );
    this.torchKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.F,
    );

    // Reset button — top-right corner, fixed to camera
    const resetBtn = this.add
      .text(this.scale.width - 8, 8, '↺', { fontSize: '20px', color: '#aaaaaa' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => resetBtn.setColor('#ffffff'))
      .on('pointerout',  () => resetBtn.setColor('#aaaaaa'))
      .on('pointerdown', () => this.scene.restart());
  }

  update(): void {
    if (this.gameOver) return;

    const delta = this.game.loop.delta;

    this.icePass();
    this.switchPass();
    this.carryPass();
    this.player.update(this.dpad.state);
    for (const enemy of this.enemies) enemy.update(this.player);
    for (const zone of this.directionalZones) zone.update(delta);
    this.directionalPass();
    this.teleporterPass();
    this.solidityPass();
    this.bombPass(delta);
    this.firePass(delta);
    this.burningPass(delta);
    this.updateCamera();
    this.healthBar.update(this.player);

    // Torch: place fire one tile ahead (F key)
    if (Phaser.Input.Keyboard.JustDown(this.torchKey) && this.player.hasItem('torch')) {
      const { dx, dy } = this.player.facingDir;
      const col = Math.floor((this.player.gameObject.x + dx * TILE_SIZE) / TILE_SIZE);
      const row = Math.floor((this.player.gameObject.y + dy * TILE_SIZE) / TILE_SIZE);
      this.igniteBFS(col, row);
    }

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

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.scene.restart();
    }
  }

  private handleExit(zone: ExitZone): void {
    this.gameOver = true;
    if (zone.targetRoom) {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
        const base = import.meta.env.BASE_URL ?? '/';
        let roomData: unknown = null;
        try {
          const res = await fetch(`${base}${zone.targetRoom}.json`);
          if (res.ok) roomData = await res.json();
        } catch { /* fall through to default room */ }
        // Save inventory so it survives the scene restart
        const inv: Record<string, number> = {};
        for (const item of ['key', 'torch', 'bomb', 'shovel']) {
          const n = this.player.getCount(item);
          if (n > 0) inv[item] = n;
        }
        this.registry.set('urlRoom', roomData);
        this.registry.set('spawnOverride', { x: zone.targetSpawnX, y: zone.targetSpawnY });
        this.registry.set('savedInventory', inv);
        this.scene.restart();
      });
    } else {
      new ExitScreen(this, () => this.scene.restart());
    }
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
      if (this.carriedBlock?.gameObject === go) continue; // skip while carried
      this.physics.world.collide(go, this.walls);
      this.physics.world.collide(go, this.obstacles);
    }
    // Extra resolution pass for thrown pots
    for (const pot of this.pots) {
      if (!pot.gameObject.active || pot.broken || pot.carried) continue;
      this.physics.world.collide(pot.gameObject, this.walls);
      this.physics.world.collide(pot.gameObject, this.obstacles);
    }
  }

  private buildFloor(width: number, height: number): void {
    this.add.tileSprite(width / 2, height / 2, width, height, FLOOR_TILE_KEY);
  }

  private buildBaseTiles(room: (typeof ROOM_DEFS)[string]): void {
    for (const { x, y, texture } of room.baseTiles ?? []) {
      this.add.image(entPx(x), entPx(y), texture).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0.5);
    }
  }

  private buildTopTiles(room: (typeof ROOM_DEFS)[string]): void {
    this.topTileObjects = [];
    for (const def of room.topTiles ?? []) {
      const sprite = this.add.image(entPx(def.x), entPx(def.y), def.texture).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0.7);
      this.topTileObjects.push({ sprite, col: def.x, row: def.y, hiddenPickup: def.hiddenPickup });
    }
  }

  /** Dig the top tile directly in front of the player. Called when player has a shovel. */
  private tryDig(): void {
    const { dx, dy } = this.player.facingDir;
    const col = Math.floor((this.player.gameObject.x + dx * TILE_SIZE) / TILE_SIZE);
    const row = Math.floor((this.player.gameObject.y + dy * TILE_SIZE) / TILE_SIZE);

    const idx = this.topTileObjects.findIndex(t => t.col === col && t.row === row);
    if (idx < 0) return;

    const { sprite, hiddenPickup } = this.topTileObjects[idx];
    this.topTileObjects.splice(idx, 1);

    this.tweens.add({
      targets: sprite,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 200,
      onComplete: () => sprite.destroy(),
    });

    if (hiddenPickup) {
      const pickup = new Pickup(this, entPx(col), entPx(row), hiddenPickup);
      this.pickups.push(pickup);
      this.physics.add.overlap(this.player.gameObject, pickup.gameObject, () => {
        if (pickup.isCollected) return;
        pickup.collect(() => {
          this.player.addItem(hiddenPickup, 1);
          this.updateKeyHud();
          this.pickups = this.pickups.filter(p => p !== pickup);
        });
      });
    }
  }

  // ── Camera ─────────────────────────────────────────────────────────────

  private updateCamera(snap = false): void {
    const cam = this.cameras.main;
    const vw = this.scale.width;
    const vh = this.scale.height;

    const targetX = this.roomW <= vw
      ? (this.roomW - vw) / 2
      : Phaser.Math.Clamp(this.player.gameObject.x - vw / 2, 0, this.roomW - vw);

    const targetY = this.roomH <= vh
      ? (this.roomH - vh) / 2
      : Phaser.Math.Clamp(this.player.gameObject.y - vh / 2, 0, this.roomH - vh);

    if (snap) {
      cam.setScroll(targetX, targetY);
    } else {
      cam.scrollX += (targetX - cam.scrollX) * 0.1;
      cam.scrollY += (targetY - cam.scrollY) * 0.1;
    }
  }

  // ── Bomb / explosion ───────────────────────────────────────────────────

  private bombPass(delta: number): void {
    for (const bomb of this.bombs) {
      bomb.update(delta, (bx, by) => this.explodeAt(bx, by));
    }
    this.bombs = this.bombs.filter(b => !b.exploded);
  }

  private explodeAt(bx: number, by: number): void {
    // Destroy the bomb game object now that it has exploded
    const bomb = this.bombs.find(b => b.exploded && b.gameObject.active);
    if (bomb) bomb.gameObject.destroy();

    // Visual: expanding orange ring + brief white flash
    const ring = this.add.graphics().setDepth(10);
    ring.fillStyle(0xffaa00, 0.75);
    ring.fillCircle(0, 0, BLAST_RADIUS);
    ring.x = bx; ring.y = by;
    this.tweens.add({
      targets: ring, alpha: 0, scaleX: 1.4, scaleY: 1.4,
      duration: 350, onComplete: () => ring.destroy(),
    });
    const flash = this.add.graphics().setDepth(11);
    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(0, 0, BLAST_RADIUS * 0.5);
    flash.x = bx; flash.y = by;
    this.tweens.add({
      targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy(),
    });

    const dist = (x: number, y: number) => Phaser.Math.Distance.Between(bx, by, x, y);

    // Damage player
    if (dist(this.player.gameObject.x, this.player.gameObject.y) <= BLAST_RADIUS) {
      this.player.takeDamage(2);
    }

    // Kill enemies in blast
    for (const enemy of this.enemies) {
      if (!enemy.gameObject.active || enemy.isDead || enemy.fallingIn) continue;
      if (dist(enemy.gameObject.x, enemy.gameObject.y) <= BLAST_RADIUS) enemy.kill();
    }

    // Shatter breakable blocks; ignite flammable ones
    for (const block of this.blocks) {
      if (!block.gameObject.active || block.shattered) continue;
      if (dist(block.gameObject.x, block.gameObject.y) > BLAST_RADIUS) continue;
      if (block.flammable) {
        const col = Math.floor(block.gameObject.x / TILE_SIZE);
        const row = Math.floor(block.gameObject.y / TILE_SIZE);
        block.shatter();
        this.igniteBFS(col, row);
      } else if (block.breakable) {
        block.shatter();
      }
    }

    // Break pots
    for (const pot of this.pots) {
      if (pot.broken || !pot.gameObject.active) continue;
      if (dist(pot.gameObject.x, pot.gameObject.y) <= BLAST_RADIUS) pot.break();
    }

    // Chain-react other armed bombs
    for (const other of this.bombs) {
      if (other.exploded || other._carried) continue;
      if (dist(other.gameObject.x, other.gameObject.y) <= BLAST_RADIUS) {
        other.exploded = true;
        this.time.delayedCall(80, () => this.explodeAt(other.gameObject.x, other.gameObject.y));
      }
    }

    // Ignite flammable zones within blast
    for (const rect of this.flammableRects) {
      for (let r = 0; r < rect.height / TILE_SIZE; r++) {
        for (let c = 0; c < rect.width / TILE_SIZE; c++) {
          const col = rect.x / TILE_SIZE + c;
          const row = rect.y / TILE_SIZE + r;
          const tx = entPx(col); const ty = entPx(row);
          if (dist(tx, ty) <= BLAST_RADIUS) this.igniteBFS(col, row);
        }
      }
    }
  }

  // ── Fire / flammability ────────────────────────────────────────────────

  /** Spawn a single fire at a cell. Deduplicates — no-op if already burning. */
  private spawnFire(col: number, row: number): void {
    if (this.fires.some(f => f.col === col && f.row === row && !f.extinguished)) return;
    this.fires.push(new Fire(this, entPx(col), entPx(row), col, row));
  }

  /**
   * BFS from (startCol, startRow): ignite that cell immediately, then wave-by-wave
   * spread to connected flammable neighbours, each wave delayed by WAVE_DELAY ms.
   */
  private igniteBFS(startCol: number, startRow: number): void {
    const WAVE_DELAY = 600; // ms per BFS depth level
    const scheduled = new Set<string>();
    const queue: Array<{ col: number; row: number; depth: number }> = [
      { col: startCol, row: startRow, depth: 0 },
    ];
    scheduled.add(`${startCol},${startRow}`);

    let i = 0;
    while (i < queue.length) {
      const { col, row, depth } = queue[i++];
      this.time.delayedCall(depth * WAVE_DELAY, () => {
        this.spawnFire(col, row);
      });
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        const nc = col + dc;
        const nr = row + dr;
        const key = `${nc},${nr}`;
        if (!scheduled.has(key) && this.isTileFlammable(nc, nr)) {
          scheduled.add(key);
          queue.push({ col: nc, row: nr, depth: depth + 1 });
        }
      }
    }
  }

  private isTileFlammable(col: number, row: number): boolean {
    const cx = entPx(col); const cy = entPx(row);
    for (const rect of this.flammableRects) {
      if (rect.contains(cx, cy)) return true;
    }
    for (const block of this.blocks) {
      if (!block.gameObject.active || !block.flammable || block.shattered) continue;
      if (Math.floor(block.gameObject.x / TILE_SIZE) === col &&
          Math.floor(block.gameObject.y / TILE_SIZE) === row) return true;
    }
    return false;
  }

  private firePass(delta: number): void {
    for (const fire of this.fires) {
      if (fire.extinguished) continue;

      fire.update(delta);

      // Damage tick — hurt player / set burning when they stand in fire
      if (fire.damageTick(delta)) {
        const fx = fire.gameObject.x; const fy = fire.gameObject.y;
        const half = TILE_SIZE / 2 + 4;

        if (Math.abs(this.player.gameObject.x - fx) < half &&
            Math.abs(this.player.gameObject.y - fy) < half) {
          this.player.takeDamage(1);
          if (!this.playerBurning) {
            this.playerBurning = true;
            this.playerBurnTimer = 0;
            this.playerBurnDmgTimer = 0;
          }
        }

        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.gameObject.active || e.isDead || e.fallingIn) continue;
          if (Math.abs(e.gameObject.x - fx) < half && Math.abs(e.gameObject.y - fy) < half) {
            if (!this.enemyBurning[i]) {
              this.enemyBurning[i]    = true;
              this.enemyBurnTimers[i] = 0;
              this.enemyBurnDmgTimers[i] = 0;
            }
          }
        }
      }

      // Ignite flammable blocks that land on this fire tile (e.g. pushed into it)
      for (const block of this.blocks) {
        if (!block.gameObject.active || !block.flammable || block.shattered) continue;
        const bc = Math.floor(block.gameObject.x / TILE_SIZE);
        const br = Math.floor(block.gameObject.y / TILE_SIZE);
        if (bc === fire.col && br === fire.row) {
          block.shatter();
          this.igniteBFS(bc, br);
        }
      }
    }

    this.fires = this.fires.filter(f => !f.extinguished);
  }

  // ── Burning status ─────────────────────────────────────────────────────

  private burningPass(delta: number): void {
    const BURN_DURATION     = 4000;
    const BURN_DMG_INTERVAL = 1000;
    const BURN_KILL_TIME    = 2500; // enemies die after this long burning

    if (this.playerBurning && !this.player.isDead) {
      this.playerBurnTimer    += delta;
      this.playerBurnDmgTimer += delta;
      if (this.playerBurnDmgTimer >= BURN_DMG_INTERVAL) {
        this.playerBurnDmgTimer = 0;
        this.player.takeDamage(1);
      }
      const phase = Math.floor(this.playerBurnTimer / 220) % 2;
      this.player.setColor(phase === 0 ? 0xff6600 : this.player.currentColor);
      if (this.playerBurnTimer >= BURN_DURATION) {
        this.playerBurning = false;
        this.player.setColor(this.player.currentColor);
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemyBurning[i]) continue;
      const e = this.enemies[i];
      if (!e.gameObject.active || e.isDead || e.fallingIn) { this.enemyBurning[i] = false; continue; }
      this.enemyBurnTimers[i]    += delta;
      this.enemyBurnDmgTimers[i] += delta;
      const phase = Math.floor(this.enemyBurnTimers[i] / 220) % 2;
      e.gameObject.setTint(phase === 0 ? 0xff6600 : 0x40e0d0);
      if (this.enemyBurnTimers[i] >= BURN_KILL_TIME) {
        e.kill();
        this.enemyBurning[i] = false;
      }
    }
  }

  private buildWalls(width: number, height: number): void {
    this.walls = this.physics.add.staticGroup();
    const t = WALL_THICKNESS;

    // Invisible collision slabs — visuals are provided by tile sprites below
    for (const [x, y, w, h] of [
      [width / 2, t / 2, width, t],
      [width / 2, height - t / 2, width, t],
      [t / 2, height / 2, t, height],
      [width - t / 2, height / 2, t, height],
    ] as [number, number, number, number][]) {
      this.walls.add(this.add.rectangle(x, y, w, h, 0, 0));
    }
    this.walls.refresh();

    // Brick tile visuals over each wall slab
    this.add.tileSprite(width / 2, t / 2,            width, t, BRICK_TILE_KEY);
    this.add.tileSprite(width / 2, height - t / 2,   width, t, BRICK_TILE_KEY);
    this.add.tileSprite(t / 2,     height / 2,        t, height, BRICK_TILE_KEY);
    this.add.tileSprite(width - t / 2, height / 2,   t, height, BRICK_TILE_KEY);
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
    for (const { x, y, pushable, transportable, breakable, flammable } of room.blocks ?? []) {
      const block = new Block(this, entPx(x), entPx(y), pushable, transportable, breakable, flammable);
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
    // How fast entities are pulled toward the zone's lane center (perpendicular axis).
    // Proportional to distance so it feels like a gentle suction rather than a snap.
    const ALIGN_SPEED = 150;

    this.playerOnDirectional = false;

    for (const zone of this.directionalZones) {
      const zx = zone.gameObject.x;
      const zy = zone.gameObject.y;
      const hw = zone.gameObject.width  / 2;
      const hh = zone.gameObject.height / 2;

      const apply = (ex: number, ey: number, setVel: (vx: number, vy: number) => void): boolean => {
        if (ex < zx - hw || ex > zx + hw || ey < zy - hh || ey > zy + hh) return false;
        let vx = zone.vx;
        let vy = zone.vy;
        if (zone.vx !== 0) {
          // Horizontal zone — pull entity toward vertical center of the lane
          const dy = zy - ey;
          vy = Math.sign(dy) * Math.min(Math.abs(dy) * 6, ALIGN_SPEED);
        } else {
          // Vertical zone — pull entity toward horizontal center of the lane
          const dx = zx - ex;
          vx = Math.sign(dx) * Math.min(Math.abs(dx) * 6, ALIGN_SPEED);
        }
        setVel(vx, vy);
        return true;
      };

      if (apply(
        this.player.gameObject.x, this.player.gameObject.y,
        (vx, vy) => this.player.body.setVelocity(vx, vy),
      )) this.playerOnDirectional = true;

      for (const enemy of this.enemies) {
        if (enemy.fallingIn) continue;
        apply(
          enemy.gameObject.x, enemy.gameObject.y,
          (vx, vy) => enemy.body.setVelocity(vx, vy),
        );
      }
    }
  }

  /**
   * Handles pick-up and drop of transportable blocks (E key).
   * While carrying, the block floats above the player each frame.
   * Carrying a block counts as block-weight on switches (handled in switchPass).
   */
  private carryPass(): void {
    const PICKUP_RANGE = TILE_SIZE * 1.5;
    const THROW_SPEED  = 220;

    if (this.player.actionJustPressed) {
      if (this.carriedBlock) {
        // Drop block one tile ahead
        const { dx, dy } = this.player.facingDir;
        this.carriedBlock.drop(
          this.player.gameObject.x + dx * TILE_SIZE,
          this.player.gameObject.y + dy * TILE_SIZE,
        );
        this.carriedBlock = null;
      } else if (this.carriedBomb) {
        // Throw bomb in facing direction
        const { dx, dy } = this.player.facingDir;
        this.carriedBomb.throw(
          this.player.gameObject.x + dx * TILE_SIZE,
          this.player.gameObject.y + dy * TILE_SIZE,
          dx * 180,
          dy * 180,
        );
        this.carriedBomb = null;
      } else if (this.carriedPot) {
        // Throw pot in facing direction
        const { dx, dy } = this.player.facingDir;
        this.carriedPot.throw(
          this.player.gameObject.x + dx * TILE_SIZE,
          this.player.gameObject.y + dy * TILE_SIZE,
          dx * THROW_SPEED,
          dy * THROW_SPEED,
        );
        this.carriedPot = null;
      } else {
        // Pick up the nearest transportable block OR pot within range
        let nearestBlock: Block | null = null;
        let nearestPot:   Pot   | null = null;
        let bestBlockDist = Infinity;
        let bestPotDist   = Infinity;

        for (const block of this.blocks) {
          if (!block.transportable || !block.gameObject.active) continue;
          const dist = Phaser.Math.Distance.Between(
            this.player.gameObject.x, this.player.gameObject.y,
            block.gameObject.x, block.gameObject.y,
          );
          if (dist < PICKUP_RANGE && dist < bestBlockDist) { nearestBlock = block; bestBlockDist = dist; }
        }
        for (const pot of this.pots) {
          if (pot.broken || !pot.gameObject.active) continue;
          const dist = Phaser.Math.Distance.Between(
            this.player.gameObject.x, this.player.gameObject.y,
            pot.gameObject.x, pot.gameObject.y,
          );
          if (dist < PICKUP_RANGE && dist < bestPotDist) { nearestPot = pot; bestPotDist = dist; }
        }

        if (nearestPot && bestPotDist <= bestBlockDist) {
          this.carriedPot = nearestPot;
          nearestPot.pickUp();
        } else if (nearestBlock) {
          this.carriedBlock = nearestBlock;
          nearestBlock.pickUp();
        } else if (this.player.hasItem('bomb')) {
          // Arm a bomb from inventory
          this.player.removeItem('bomb', 1);
          const bomb = new Bomb(this, this.player.gameObject.x, this.player.gameObject.y);
          bomb.pickUp();
          this.bombs.push(bomb);
          this.carriedBomb = bomb;
        } else if (this.player.hasItem('shovel')) {
          // Nothing to carry — try to dig a top tile in front
          this.tryDig();
        }
      }
    }

    // Keep carried items above the player's head each frame.
    // body.reset() keeps physics body and game object in sync.
    if (this.carriedBlock) {
      const bx = this.player.gameObject.x;
      const by = this.player.gameObject.y - TILE_SIZE;
      (this.carriedBlock.gameObject.body as Phaser.Physics.Arcade.Body).reset(bx, by);
    }
    if (this.carriedPot) {
      const bx = this.player.gameObject.x;
      const by = this.player.gameObject.y - TILE_SIZE;
      (this.carriedPot.gameObject.body as Phaser.Physics.Arcade.Body).reset(bx, by);
    }
    if (this.carriedBomb) {
      const bx = this.player.gameObject.x;
      const by = this.player.gameObject.y - TILE_SIZE;
      (this.carriedBomb.gameObject.body as Phaser.Physics.Arcade.Body).reset(bx, by);
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
    for (const { x, y, group, mode, requires, enabled } of room.switches ?? []) {
      this.switches.push(
        new Switch(this, entPx(x), entPx(y), group, mode, requires, enabled),
      );
    }
  }

  /**
   * Evaluates every switch each frame and opens/closes linked doors accordingly.
   * A door opens when ANY switch in its group is active (OR logic).
   *
   * Activation requires the centre of the entity to be within the switch tile,
   * rather than any-pixel overlap, so walking past a switch doesn't accidentally
   * trigger it.
   */
  private switchPass(): void {
    const pushableBlocks = this.blocks.filter(
      (b) => b.pushable && b.gameObject.active,
    );

    // Returns true when the entity centre (ex, ey) is inside the switch tile.
    const centreOn = (ex: number, ey: number, sw: Switch): boolean => {
      const hw = TILE_SIZE / 2;
      return (
        ex >= sw.gameObject.x - hw && ex <= sw.gameObject.x + hw &&
        ey >= sw.gameObject.y - hw && ey <= sw.gameObject.y + hw
      );
    };

    for (const sw of this.switches) {
      const req = sw.requires ?? 'any';
      let pressedNow = false;

      // Player counts unless requires is 'block'
      if (req !== 'block') {
        const itemType = req.startsWith('item:') ? req.slice(5) : null;
        const playerQualifies = itemType ? this.player.hasItem(itemType) : true;
        if (playerQualifies && centreOn(this.player.gameObject.x, this.player.gameObject.y, sw)) {
          pressedNow = true;
        }
      }

      // Pushable blocks, carried items, and resting pots count for 'any' and 'block'
      if (!pressedNow && req !== 'item' && !req.startsWith('item:')) {
        for (const block of pushableBlocks) {
          if (centreOn(block.gameObject.x, block.gameObject.y, sw)) {
            pressedNow = true;
            break;
          }
        }
        // Carried block/pot: use player position since their bodies are repositioned above the player
        if (!pressedNow && (this.carriedBlock || this.carriedPot) &&
            centreOn(this.player.gameObject.x, this.player.gameObject.y, sw)) {
          pressedNow = true;
        }
        // Resting pots count the same as blocks
        for (const pot of this.pots) {
          if (pot.broken || pot.carried) continue;
          if (centreOn(pot.gameObject.x, pot.gameObject.y, sw)) {
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
        for (const door of this.switchDoors.filter((d) => d.group === sw.group)) {
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

  private buildPots(room: (typeof ROOM_DEFS)[string]): void {
    this.pots = [];
    for (const { x, y } of room.pots ?? []) {
      this.pots.push(new Pot(this, entPx(x), entPx(y)));
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

  private buildLockedBlocks(room: (typeof ROOM_DEFS)[string]): void {
    this.lockedBlocks = [];
    for (const { requires, x, y } of room.lockedBlocks ?? []) {
      this.lockedBlocks.push(new LockedBlock(this, entPx(x), entPx(y), requires));
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
              zoneDef.id,
              zoneDef.destination,
              zoneDef.active,
            ),
          );
          break;
        }
        case "exit":
          this.exitZones.push(
            new ExitZone(
              this, areaPx(x, w), areaPx(y, h), areaW(w), areaH(h),
              zoneDef.targetRoom,
              zoneDef.targetSpawnX,
              zoneDef.targetSpawnY,
            ),
          );
          break;
        case "flammable":
          // Invisible in-game — just track the rect for fire spread/ignition
          this.flammableRects.push(
            new Phaser.Geom.Rectangle(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE),
          );
          break;
      }
    }
  }

  /**
   * Each frame: determine which teleporter pads contain the player's centre.
   * A pad only fires when the player freshly enters it (wasn't on it last frame),
   * preventing re-teleport until they leave and return.
   */
  private teleporterPass(): void {
    const px = this.player.gameObject.x;
    const py = this.player.gameObject.y;
    const currentlyOn = new Set<TeleporterZone>();

    for (const tp of this.teleporterZones) {
      const zx = tp.gameObject.x;
      const zy = tp.gameObject.y;
      const hw = tp.gameObject.width  / 2;
      const hh = tp.gameObject.height / 2;

      if (px < zx - hw || px > zx + hw || py < zy - hh || py > zy + hh) continue;

      currentlyOn.add(tp);

      // Only fire if the player just entered (wasn't here last frame) and the pad can send
      if (this.playerOnTeleporters.has(tp) || !tp.active) continue;

      const dest = this.resolveTeleportDest(tp);
      if (!dest) continue;

      this.player.body.reset(dest.gameObject.x, dest.gameObject.y);
      // Mark the destination as occupied immediately so it doesn't fire this same frame
      currentlyOn.add(dest);
    }

    this.playerOnTeleporters = currentlyOn;
  }

  /** Resolve the destination TeleporterZone for a given pad. */
  private resolveTeleportDest(tp: TeleporterZone): TeleporterZone | null {
    if (tp.destination === "random") {
      const pool = this.teleporterZones.filter((t) => t !== tp && t.group === tp.group);
      return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    if (tp.destination) {
      return this.teleporterZones.find((t) => t.id === tp.destination) ?? null;
    }
    // Fallback: cycle to the next pad in the same group (original behaviour)
    const group = this.teleporterZones.filter((t) => t.group === tp.group);
    if (group.length <= 1) return null;
    return group[(group.indexOf(tp) + 1) % group.length];
  }
}
