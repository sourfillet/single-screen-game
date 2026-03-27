import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // On GitHub Actions, the site is served at /<repo-name>/ — set base accordingly.
  // Locally the base stays '/' so paths resolve from root.
  base: process.env.GITHUB_ACTIONS ? '/single-screen-game/' : '/',
  server: {
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
})
