import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
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
