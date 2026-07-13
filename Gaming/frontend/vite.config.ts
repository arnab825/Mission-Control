/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

// Custom plugin to remove deprecated inlineDynamicImports and force codeSplitting: false
const cleanElectronBuildPlugin = () => ({
  name: 'clean-electron-build',
  configResolved(config: any) {
    if (config.build) {
      if (config.build.lib) {
        config.build.lib.formats = ['cjs'];
      }
      const output = config.build.rolldownOptions?.output || config.build.rollupOptions?.output;
      if (output) {
        if (Array.isArray(output)) {
          for (const out of output) {
            out.format = 'cjs';
            delete out.inlineDynamicImports;
            out.codeSplitting = false;
          }
        } else {
          output.format = 'cjs';
          delete output.inlineDynamicImports;
          output.codeSplitting = false;
        }
      }
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: true,
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }

          if (id.includes('recharts') || id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }

          if (id.includes('electron') || id.includes('electron-updater')) {
            return 'vendor-electron';
          }

          return 'vendor';
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          plugins: [cleanElectronBuildPlugin()],
          build: {
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs']
            },
            rolldownOptions: {
              external: ['electron'],
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            },
            rollupOptions: {
              external: ['electron'],
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            }
          }
        }
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          plugins: [cleanElectronBuildPlugin()],
          build: {
            rolldownOptions: {
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            },
            rollupOptions: {
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            }
          }
        }
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
