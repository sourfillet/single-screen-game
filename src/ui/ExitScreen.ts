import Phaser from 'phaser'

/**
 * Full-screen overlay shown when the player reaches the exit.
 * Press R or tap to restart (continue to next room would hook here later).
 */
export class ExitScreen {
  constructor(scene: Phaser.Scene, onContinue: () => void) {
    const { width, height } = scene.scale
    const cx = width  / 2
    const cy = height / 2

    const overlay = scene.add
      .rectangle(cx, cy, width, height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(0)
      .setInteractive()
      .on('pointerdown', onContinue)

    const title = scene.add
      .text(cx, cy - 32, 'LEVEL CLEAR', { fontSize: '52px', color: '#f0d000', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setAlpha(0)

    const subtitle = scene.add
      .text(cx, cy + 32, 'Press R or tap to continue', { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setAlpha(0)

    scene.tweens.add({
      targets: [overlay, title, subtitle],
      alpha: 1,
      duration: 500,
      ease: 'Power1',
    })

    scene.input.keyboard!.once('keydown-R', onContinue)
  }
}
