import { importAssertions } from 'acorn-import-assertions';
import { importAssertionsPlugin } from 'rollup-plugin-import-assert';

export default {
  input: 'src/index.mjs',
  external: ['path', 'url', 'fs', 'util', 'import-maps', 'schema-utils'],
  treeshake: false,
  acornInjectPlugins: [
    importAssertions
  ],
  plugins: [
    importAssertionsPlugin(),
  ],
  output: {
    file: 'dist/index.cjs',
    format: 'cjs'
  }
};
