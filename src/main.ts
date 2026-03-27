import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

async function boot() {
  // Detect level slug from URL before Phaser starts.
  // On GitHub Pages, 404.html rewrites /{slug} → /?level={slug}
  const base = import.meta.env.BASE_URL ?? '/';
  const pathSlug = window.location.pathname
    .slice(base.length)
    .replace(/^\/+|\/+$/g, '');
  const querySlug = new URLSearchParams(window.location.search).get('level') ?? '';
  const slug = (pathSlug && !pathSlug.endsWith('.html')) ? pathSlug : querySlug;

  let urlRoom: unknown = null;
  if (slug) {
    try {
      const res = await fetch(`${base}${slug}.json`);
      if (res.ok) {
        urlRoom = await res.json();
      }
    } catch {
      // Level file not found — fall back to default
    }
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 608,
    backgroundColor: '#000000',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set('urlRoom', urlRoom);
      },
    },
  }

  new Phaser.Game(config)
}

boot()
