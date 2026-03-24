import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,        // WebGL with Canvas fallback
  width: 800,
  height: 608,   // 38 tiles × 16 px — keeps the canvas on a clean tile grid
  backgroundColor: '#000000',
  pixelArt: true,           // nearest-neighbor filtering — required for crisp pixel sprites
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,           // Letterbox-fit to any screen size
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
