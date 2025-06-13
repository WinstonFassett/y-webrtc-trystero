import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

// Only include minification in production builds
const minificationPlugins = process.env.PRODUCTION
  ? [terser({
    module: true,
    compress: {
      hoist_vars: true,
      module: true,
      passes: 1,
      pure_getters: true,
      unsafe_comps: true,
      unsafe_undefined: true
    },
    mangle: {
      toplevel: true
    }
  })]
  : []

export default {
  input: './src/y-webrtc-trystero.js',
  external: id => /^(lib0|yjs|y-protocols|trystero)/.test(id),
  output: [{
    name: 'y-webrtc-trystero',
    file: 'dist/y-webrtc-trystero.cjs',
    format: 'cjs',
    sourcemap: true
  }],
  plugins: [
    nodeResolve({
      mainFields: ['module', 'browser', 'main']
    }),
    commonjs(),
    ...minificationPlugins
  ]
}
