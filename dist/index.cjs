'use strict';

// This file is auto-generated by Rollup

Object.defineProperty(exports, '__esModule', { value: true });

var importMaps = require('import-maps');
var schemaUtils = require('schema-utils');
var path = require('path');
var fs = require('fs');
var fsPromises = require('fs/promises');
var url = require('url');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var fsPromises__default = /*#__PURE__*/_interopDefaultLegacy(fsPromises);

const __dirname$1 = path__default["default"].dirname(url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.cjs', document.baseURI).href))));
const optionsSchema = JSON.parse(fs__default["default"].readFileSync(path__default["default"].resolve(__dirname$1, '../src/options.schema.json'), {encoding: 'utf-8'}));

function importMapsPlugin(options) {
  schemaUtils.validate(optionsSchema, options, {
    name: 'rollup-plugin-import-maps',
    baseDataPath: 'options'
  });
  let {srcObject, srcText, srcPath, baseDir, transformingReport, exclude, noTransforming} = options;
  let rawImportMaps = null;
  if (typeof srcObject === 'object') {
    if (srcObject instanceof Buffer) {
      throw new Error('Use of Buffer as options.srcObject is no longer supported, use Object as options.srcObject or try options.srcText instead');
    } else {
      rawImportMaps = JSON.stringify(srcObject);
    }
  } else if (typeof srcText === 'string') {
    rawImportMaps = srcText;
  } else if (typeof srcPath === 'string') {
    rawImportMaps = fs__default["default"].readFileSync(srcPath, {encoding: 'utf-8'});
  } else {
    throw new Error('One of srcObject, srcText or srcPath should be specified in options');
  }
  const fakeBaseURI = 'ftp://fakedomain';
  let parsedImportMaps = importMaps.parseFromString(rawImportMaps, fakeBaseURI);
  baseDir = baseDir ? path__default["default"].resolve(baseDir) : process.cwd();
  let report;
  if (transformingReport) {
    report = {};
  }
  let isExcluded;
  if (typeof exclude === 'string') {
    let extensions = exclude.split(/, */).filter((ext) => ext.length > 0);
    isExcluded = (source) => {
      if (source.startsWith('data:'))
        return false;
      let filename = path__default["default"].basename(source);
      let extname = path__default["default"].extname(filename);
      return extensions.has(extname) || extensions.has(filename);
    };
  } else if (typeof exclude === 'function') {
    isExcluded = exclude;
  } else if (exclude instanceof RegExp) {
    isExcluded = (source) => exclude.test(source);
  }

  let file2pathnameCache = {};
  let getScriptPath = (scriptFile) => {
    let scriptPath = file2pathnameCache[scriptFile];
    if (!scriptPath) {
      file2pathnameCache[scriptFile] = scriptPath = path__default["default"].relative(baseDir, scriptFile).replace(/\\/g, () => '/');
    }
    return scriptPath;
  };

  let file2urlCache = {};
  let getFakeURL = (scriptFile) => {
    let scriptURL = file2urlCache[scriptFile];
    if (!scriptURL) {
      file2urlCache[scriptFile] = scriptURL = new URL(getScriptPath(scriptFile), fakeBaseURI);
    }
    return scriptURL;
  };
  let sourceRoot;

  function transformImportSpecifier(source, importer) {
    let scriptURL = getFakeURL(importer);
    let parsedUrl = importMaps.resolve(source, parsedImportMaps, scriptURL);
    let newSource;
    if (parsedUrl.origin === fakeBaseURI) { // e.g. "/path/to/module.js"
      newSource = parsedUrl.href.slice(fakeBaseURI.length);
    } else if (parsedUrl.protocol === 'ftp:' && parsedUrl.host !== 'fakedomain') { // e.g. "//example.com/path/to/module.js"
      newSource = parsedUrl.href.slice('ftp:'.length);
    } else { // e.g. "https://example.com/path/to/module.js"
      newSource = parsedUrl.href;
    }
    if (newSource === source) {
      return null;
    }
    if (noTransforming) {
      return {
        id: source,
        external: 'absolute'
      };
    }
    if (report) {
      let pathname = '/' + getScriptPath(importer);
      let map = report[pathname];
      if (!map) {
        map = report[pathname] = {};
      }
      map[source] = newSource;
    }
    return {
      id: newSource,
      external: 'absolute'
    };
  }

  return {
    name: 'import-maps',
    async buildStart(config) {
      if (!noTransforming) {
        let checkSpecifiers = (imports) => {
          Object.keys(imports).forEach((specifier) => {
            if (config.external(specifier)) {
              console.warn('cannot transform specifier "' + specifier + '", it is already listed in rollup config external');
            }
          });
        };
        checkSpecifiers(parsedImportMaps.imports);
        let {scopes} = parsedImportMaps;
        if (scopes) {
          Object.keys(scopes).forEach((prefix) => {
            checkSpecifiers(scopes[prefix]);
          });
        }
      }
    },
    resolveDynamicImport(source, importer) {
      if (!importer) {
        return null;
      }
      if (typeof source === 'string') {
        if (source.startsWith('./') || source.startsWith('../')) {
          let sourceSpecifier = './' + path__default["default"].relative(sourceRoot, path__default["default"].resolve(path__default["default"].dirname(importer), source)).replace(/\\/g, '/');
          return {id: sourceSpecifier, external: 'absolute'};
        }
        if (source.startsWith('/')) {
          return {id: source, external: 'absolute'};
        }
        return transformImportSpecifier(source, importer);
      } else {
        // skip identifier / expression / template literal
        return null;
      }
    },
    resolveId(source, importer, info) {
      if (info.isEntry) {
        sourceRoot = path__default["default"].resolve(path__default["default"].dirname(source));
        return null;
      }
      if (!importer) {
        return null;
      }
      if (source.startsWith('./') || source.startsWith('../')) {
        return null;
      }
      if (source.startsWith('/')) {
        return {id: source, external: 'absolute'};
      }
      if (exclude && isExcluded(source)) {
        return null;
      }
      return transformImportSpecifier(source, importer);
    },
    async buildEnd(err) {
      if (!err && report) {
        if (transformingReport === '-') {
          console.log(JSON.stringify(report, null, 2));
        } else {
          await fsPromises__default["default"].writeFile(path__default["default"].resolve(transformingReport), JSON.stringify(report, null, 2), {encoding: 'utf-8'});
        }
      }
    },
  };
}

exports.importMapsPlugin = importMapsPlugin;
