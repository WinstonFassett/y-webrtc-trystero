import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      // Use the local package
      'y-trystero': path.resolve(__dirname, '../src/y-trystero.js'),
      // Ensure Yjs is only loaded once
      yjs: path.resolve(__dirname, '../node_modules/yjs'),
      lib0: path.resolve(__dirname, '../node_modules/lib0')
    }
  },
  optimizeDeps: {
    // Ensure these are pre-bundled
    include: ['yjs', 'lib0', 'trystero'],
    exclude: ['y-trystero']
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    commonjsOptions: {
      // Ensure Yjs is bundled properly
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
})
