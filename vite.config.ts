import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig(async ({ mode }) => {
  const plugins = [
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ]

  // Only include devtools in development
  if (mode !== 'production') {
    try {
      const { devtools } = await import('@tanstack/devtools-vite')
      plugins.unshift(devtools())
    } catch {
      // Devtools not available, skip it
    }
  }

  return {
    plugins,
  }
})
