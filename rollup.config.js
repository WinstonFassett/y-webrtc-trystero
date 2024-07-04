import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

// If truthy, it expects all y-* dependencies in the upper directory.
// This is only necessary if you want to test and make changes to several repositories.
const localImports = process.env.LOCALIMPORTS

if (localImports) {
  console.info('Using local imports')
}

const customModules = new Set([
  'y-websocket',
  'y-codemirror',
  'y-ace',
  'y-textarea',
  'y-quill',
  'y-dom',
  'y-prosemirror',
  'y-monaco'
])
/**
 * @type {Set<any>}
 */
const customLibModules = new Set([
  'lib0',
  'y-protocols'
])

// @ts-ignore We use this for debugging
const debugResolve = {
  resolveId (importee) {
    if (importee === 'd-components') {
      return `${process.cwd()}/../d-components/src/index.js`
    }
    if (localImports) {
      if (importee === 'yjs') {
        return `${process.cwd()}/../yjs/src/index.js`
      }
      if (customModules.has(importee.split('/')[0])) {
        return `${process.cwd()}/../${importee}/src/${importee}.js`
      }
      if (customLibModules.has(importee.split('/')[0])) {
        return `${process.cwd()}/../${importee}`
      }
    }
    return null
  }
}
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

const devPlugins = process.env.SERVE
  ? [
    serve({
      open: true,
      contentBase: 'dist/demo',
      port: 8080
    }),
    livereload({
      watch: 'dist/demo'
    })
  ]
  : []
const plugins = [
  debugResolve,
  nodeResolve({
    mainFields: ['module', 'browser', 'main']
  }),
  commonjs(),
  ...minificationPlugins,
  ...devPlugins,
  copy({
    targets: [
      { src: 'demo/index.html', dest: 'dist/demo' },
      { src: 'demo/main.css', dest: 'dist/demo' }
    ]
  })
]

export default [
  {
    input: './demo/index.js',
    output: [{
      dir: 'dist/demo',
      format: 'esm',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: '[name].js'
    }],
    plugins
  }, {
    input: './test/index.js',
    output: [{
      name: 'test',
      file: 'dist/test.js',
      format: 'iife',
      sourcemap: true
    }],
    plugins
  }, {
    input: './src/y-trystero.js',
    external: id => /^(lib0|yjs|y-protocols|trystero)/.test(id),
    output: [{
      name: 'y-trystero',
      file: 'dist/y-trystero.cjs',
      format: 'cjs',
      sourcemap: true
    }]
  }
]
