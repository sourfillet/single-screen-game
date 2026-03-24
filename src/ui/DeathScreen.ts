import Phaser from 'phaser'

/**
 * Full-screen overlay shown after the player dies.
 * Fades in, then waits for R (keyboard) or a tap/click to trigger `onRestart`.
 */
export class DeathScreen {
  constructor(scene: Phaser.Scene, onRestart: () => void) {
    const { width, height } = scene.scale
    const cx = width  / 2
    const cy = height / 2

    const overlay = scene.add
      .rectangle(cx, cy, width, height, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(0)
      .setInteractive()
      .on('pointerdown', onRestart)

    const title = scene.add
      .text(cx, cy - 32, 'YOU DIED', { fontSize: '52px', color: '#cc2222', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setAlpha(0)

    const subtitle = scene.add
      .text(cx, cy + 32, 'Press R or tap to retry', { fontSize: '16px', color: '#999999' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setAlpha(0)

    // Fade everything in
    scene.tweens.add({
      targets: [overlay, title, subtitle],
      alpha: 1,
      duration: 500,
      ease: 'Power1',
    })

    // Register R key — `once` so it can't fire twice
    scene.input.keyboard!.once('keydown-R', onRestart)
  }
}
