import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
  // UMD build for browsers
  {
    input: 'src/mapbox-map-tools.js',
    output: {
      file: 'dist/mapbox-map-tools.js',
      format: 'umd',
      name: 'MapboxMapTools',
      globals: {
        'mapbox-gl': 'mapboxgl'
      }
    },
    external: ['mapbox-gl'],
    plugins: [
      nodeResolve()
    ]
  },
  // Minified UMD build for browsers
  {
    input: 'src/mapbox-map-tools.js',
    output: {
      file: 'dist/mapbox-map-tools.min.js',
      format: 'umd',
      name: 'MapboxMapTools',
      globals: {
        'mapbox-gl': 'mapboxgl'
      }
    },
    external: ['mapbox-gl'],
    plugins: [
      nodeResolve(),
      terser()
    ]
  },
  // ES module build
  {
    input: 'src/mapbox-map-tools.js',
    output: {
      file: 'dist/mapbox-map-tools.esm.js',
      format: 'es'
    },
    external: ['mapbox-gl'],
    plugins: [
      nodeResolve()
    ]
  },
  // CommonJS build
  {
    input: 'src/mapbox-map-tools.js',
    output: {
      file: 'dist/mapbox-map-tools.cjs.js',
      format: 'cjs',
      exports: 'named'
    },
    external: ['mapbox-gl'],
    plugins: [
      nodeResolve()
    ]
  }
];