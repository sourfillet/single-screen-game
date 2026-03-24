/**
 * Replaces the background color of a loaded Phaser texture with full transparency.
 * The background color is sampled from the top-left pixel of the image, which is the
 * standard convention for placeholder / indexed-color sprites without an alpha channel.
 */
export function stripBackground(scene: Phaser.Scene, key: string): void {
  const texture = scene.textures.get(key)
  const source = texture.getSourceImage()

  // Canvas textures have already been processed on a previous scene init — skip
  if (!(source instanceof HTMLImageElement)) return

  const canvas = document.createElement('canvas')
  canvas.width  = source.width
  canvas.height = source.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source as HTMLImageElement, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = imageData.data

  // Sample background from the top-left corner
  const bgR = px[0]
  const bgG = px[1]
  const bgB = px[2]

  for (let i = 0; i < px.length; i += 4) {
    if (px[i] === bgR && px[i + 1] === bgG && px[i + 2] === bgB) {
      px[i + 3] = 0
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Swap the texture in Phaser's registry for the transparent version
  scene.textures.remove(key)
  scene.textures.addCanvas(key, canvas)
}
