import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// base './' : chemins relatifs, le dossier dist/ fonctionne sur n'importe quel hébergeur statique
// (GitHub Pages dans un sous-dossier compris).
export default defineConfig({
  base: './',
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
