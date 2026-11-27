import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  resolve: {
    alias: {
      '@/lib/auth/identity': fileURLToPath(
        new URL('./src/lib/auth/identity.d1.ts', import.meta.url),
      ),
      '@/lib/auth/auth': fileURLToPath(new URL('./src/lib/auth/auth.worker.ts', import.meta.url)),
      '@/domains/lessons/public-lessons': fileURLToPath(
        new URL('./src/domains/lessons/public-lessons.d1.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
