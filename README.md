# rollup-plugin-import-maps

A plugin to resolve ECMAScript module bare import specifiers at build-time for browsers which don't support import-maps, mostly based on **WICG's [import-maps reference implementation](https://github.com/WICG/import-maps/tree/master/reference-implementation)**.


## Install

```sh
npm install --save-dev rollup-plugin-import-maps
```

## Usage

1. edit rollup.config.js, import and use the plugin

```js
import { importMapsPlugin } from 'rollup-plugin-import-maps';
import { readFileSync } from 'fs';

export default {
  input: './src/index.js',
  plugins: [
    importMapsPlugin({
      srcObject: process.env.ROLLUP_WATCH ? : readFileSync('./index-dev.importmap') : readFileSync('./index-cdn.importmap')
    })
  ],
  output: {
    file: './dist/index.js',
    format: 'es'
  }
};
```

2. install some esm-ready packages, for example:

```sh
npm install vue@2.x underscore@1.x
```

3. create importmap files like index-dev.importmap

```json
{
  "imports": {
    "vue": "/node_modules/vue/dist/vue.esm.browser.min.js",
    "underscore/": "/node_modules/underscore/",
    "@/polyfills/": "/lib/polyfills/"
  }
}
```

and index-cdn.importmap

```json
{
  "imports": {
    "vue": "https://unpkg.com/vue@2.x/dist/vue.esm.browser.min.js",
    "underscore/": "https://unpkg.com/underscore@1.x/",
    "@/polyfills/": "/lib/polyfills/"
  }
}
```

4. Input file './src/index.js'

```js
import Vue from 'vue';
import shuffle from 'underscore/modules/shuffle.js';
import '@/polyfills/navigator.userAgentData.js';
// ...
```

5. use rollup to watch or build

```sh
rollup -c rollup.config.js -w
# or
rollup -c rollup.config.js
```

6. Output code './dist/index.js'

```js
import Vue from '/node_modules/vue/dist/vue.esm.browser.min.js';
import shuffle from '/node_modules/underscore/modules/shuffle.js';
import '/lib/polyfills/navigator.userAgentData.js';
// ...
```

or

```js
import Vue from 'https://unpkg.com/vue@2.x/dist/vue.esm.browser.min.js';
import shuffle from 'https://unpkg.com/underscore@1.x/modules/shuffle.js';
import '/lib/polyfills/navigator.userAgentData.js';
// ...
```

### Plugin Options

+ `srcPath`:string optional

  file path to importmap

+ `srcObject`:Buffer|ArrayBuffer|Object optional

  raw buffer of importmap
  
+ `baseDir`: string default `process.cwd()`

  baseDir to calculate scope paths in order to match scopes defined in importmap

**Note:** either srcPath or srcObject should be specified


## License

[MIT](./LICENSE)

Other licenses of dependencies

+ import-maps: [W3C Software and Document License](http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) and [W3C CLA](https://www.w3.org/community/about/agreements/cla/)
