# rollup-plugin-import-maps

A plugin to resolve ECMAScript module bare/url import specifiers at build-time for browsers which don't support import-maps, mostly based on **WICG's [import-maps reference implementation](https://github.com/WICG/import-maps/tree/master/reference-implementation)**.

This plugin plays a role of polyfill for browsers but is used at build-time rather than at run-time. If some day (maybe in 2023) all major browsers support import-maps then this plugin can be retired.

**Contents:**

<!--ts-->
   * [Install](#install)
   * [Usage](#usage)
      * [Basic Usage](#basic-usage)
      * [Plugin Options](#plugin-options)
      * [Caveats](#caveats)
      * [Use Cases](#use-cases)
         * [Bare Specifiers Transforming](#bare-specifiers-transforming)
         * [URL Specifiers Transforming](#url-specifiers-transforming)
         * [No Transforming](#no-transforming)
   * [Related Efforts](#related-efforts)
   * [Maintainers](#maintainers)
   * [License](#license)
<!--te-->



## Install

```sh
npm install --save-dev rollup-plugin-import-maps
```



## Usage

### Basic Usage

edit rollup.config.js, import and use the plugin

```js
import { importMapsPlugin } from 'rollup-plugin-import-maps';
// import { readFileSync } from 'fs';

export default {
  input: './src/index.js',
  plugins: [
    importMapsPlugin({
      srcPath: './index.importmap',
      // srcText: readFileSync('./index.importmap', { encoding: 'utf8' }),
      // srcObject: JSON.parse(readFileSync('./index.importmap', { encoding: 'utf8' })),
    }),
  ],
  output: [
    {
      file: './dist/index.js',
      format: 'es'
    }
  ]
};
```



### Plugin Options

+ `srcPath`:string optional

  file path to importmap

+ `srcText`:string optional

  plain text of importmap

+ `srcObject`:Object optional

  parsed object of importmap

  **Note:** One of `srcObject`, `srcText`, `srcPath` should be specified, if multiple of them specified, then precedence order is: srcObject, srcText, srcPath.

+ `baseDir`: string default `process.cwd()`

  baseDir to calculate scope paths in order to match scopes defined in importmap

+ `transformingReport`:string default `undefined`

  set a file path to save transforming report as a JSON file,  will output to Console if value set to `"-"`

+ `noTransforming`:boolean default `false`

  if value set to `true`, then the plugin will mark specifiers defined in importmap as external, and won't transform those specifiers. useful if you want to  build for browsers which already support import-maps and "set external list" with importmap. 
  
+ `exclude`:string|RegExp|Function default `undefined`

  skip bare/url specifiers from resolving / transforming according to importmap.

  e.g. `.json,.wasm,.css`, `/\.(json|wasm|css)$/`, `(source, importer)=> /\.(json|wasm|css)$/.test(source)`



### Caveats

+ This plugin doesn't yet support transforming module specifiers defined in data url. example data url:
  ```js
  import {foo, bar} from "data:application/javascript;charset=utf-8,import%20%7Bdefault%20as%20foo%7D%20from%20'foo'%3B%0Aexport%20%7Bfoo%7D%3B%0Aexport%20%7Bdefault%20as%20bar%7D%20from%20'bar'%3B";
  ```

  which can be decoded as

  ```js
  import {default as foo} from 'foo';
  export {foo};
  export {default as bar} from 'bar';
  ```

+ When tansforming specifiers in [dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports), only string literal can be transformed. example specifiers:

  ```js
  import('foo/locales/en/messages.js') // Yes
  import("foo/locales/en/messages.js") // Yes
  
  let lang = 'en';
  import('foo/locales/'+lang+'/messages.js') // No
  
  let modulePath = 'foo/locales/en/messages.js'
  import(modulePath)                         // No
  
  import(`foo/locales/en/messages.js`)       // No
  ```



### Use Cases

#### Bare Specifiers Transforming

importmap

```json5
{
  "imports": {
    "three": "/node_modules/three/build/three.module.js",
    "three/": "/node_modules/three/",
    "underscore": "data:application/javascript;charset=utf-8,export%20default%20window._%3B",
    "~/": "//mysite.com/packages/myapp/"
  }
}
```

input code

```js
import * as THREE from 'three';
import GLTFLoader from 'three/examples/jsm/loaders/GLTFLoader.js';
import _ from 'underscore';
import '~/polyfills/navigator.userAgentData.js';

console.log(THREE, GLTFLoader, _);

```

output code

```js
import * as THREE from '/node_modules/three/build/three.module.js';
import GLTFLoader from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import _ from 'data:application/javascript;charset=utf-8,export%20default%20window._%3B';
import '//mysite.com/packages/myapp/polyfills/navigator.userAgentData.js';

console.log(THREE, GLTFLoader, _);

```

#### URL Specifiers Transforming

importmap

```json
{
  "imports": {
    "https://unpkg.com/three@0.141.0/build/three.module.js": "/node_modules/three/build/three.module.js",
    "node-modules:/": "/node_modules/",
    "data:application/javascript;charset=utf-8,export%20default%20window._%3B": "/underscore/underscore-esm-min.js",
    "app-home:/": "//mysite.com/packages/myapp/"
  }
}
```

input code

```js
import * as THREE from 'https://unpkg.com/three@0.141.0/build/three.module.js';
import GLTFLoader from 'node-modules:/three/examples/jsm/loaders/GLTFLoader.js';
import _ from 'data:application/javascript;charset=utf-8,export%20default%20window._%3B';
import 'app-home:/polyfills/navigator.userAgentData.js';

console.log(THREE, GLTFLoader, _);

```

output code

```js
import * as THREE from '/node_modules/three/build/three.module.js';
import GLTFLoader from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import _ from '/underscore/underscore-esm-min.js';
import '//mysite.com/packages/myapp/polyfills/navigator.userAgentData.js';

console.log(THREE, GLTFLoader, _);

```

#### No Transforming

You may use rollup to build two distributions, for browsers with or without import-maps support, and load corresponding distribution conditionally. e.g.

```js
// rollup.config.js
export default [
  {
    input: './src/index.js',
    plugins: [
      importMapsPlugin({
        srcPath: './index.importmap',
        transformingReport: '-',
      }),
    ],
    output: [
      {
        file: './dist/index.js',
        format: 'es'
      }
    ]
  },
  {
    input: './src/index.js',
    plugins: [
      importMapsPlugin({
        srcPath: './index.importmap',
        noTransforming: true,
      }),
    ],
    output: [
      {
        file: './dist/index-experimental.js',
        format: 'es'
      }
    ]
  }
];
```

```html
<script type="importmap">
put content of ./index.importmap here
</script>

<script type="module">
if (HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
  console.log('Your browser supports import maps.');
  import('/dist/index-experimental.js');
}else{
  console.log('Your browser doesn\'t support import maps.');
  import('/dist/index.js');
}
</script>
```



## Related Efforts

+ [import-maps](#) - Reference implementation playground for import maps proposal



## Maintainers

[@fuweichin](https://github.com/fuweichin)




## License

[MIT](./LICENSE)

Other licenses of dependencies

+ import-maps: [W3C Software and Document License](http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) and [W3C CLA](https://www.w3.org/community/about/agreements/cla/)

