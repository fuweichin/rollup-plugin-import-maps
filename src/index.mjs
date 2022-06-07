import {resolve, parseFromString} from 'import-maps';
import {validate} from 'schema-utils';

import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optionsSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/options.schema.json'), {encoding: 'utf-8'}));

let isRelativeSpecifier = (str) => {
  return str.startsWith('./') || str.startsWith('../') || str.startsWith('/');
};

export function importMapsPlugin(options) {
  validate(optionsSchema, options, {
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
    rawImportMaps = fs.readFileSync(srcPath, {encoding: 'utf-8'});
  } else {
    throw new Error('One of srcObject, srcText or srcPath should be specified in options');
  }
  const fakeBaseURI = 'ftp://fakedomain';
  let parsedImportMaps = parseFromString(rawImportMaps, fakeBaseURI);
  baseDir = baseDir ? path.resolve(baseDir) : process.cwd();
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
      let filename = path.basename(source);
      let extname = path.extname(filename);
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
      file2pathnameCache[scriptFile] = scriptPath = path.relative(baseDir, scriptFile).replace(/\\/g, () => '/');
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
    resolveId(source, importer, info) {
      if (info.isEntry || !importer) {
        return null;
      }
      if (isRelativeSpecifier(source)) {
        return null;
      }
      if (exclude && isExcluded(source)) {
        return null;
      }
      let scriptURL = getFakeURL(importer);
      let parsedUrl = resolve(source, parsedImportMaps, scriptURL);
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
    },
    async buildEnd(err) {
      if (!err && report) {
        if (transformingReport === '-') {
          console.log(JSON.stringify(report, null, 2));
        } else {
          await fsPromises.writeFile(path.resolve(transformingReport), JSON.stringify(report, null, 2), {encoding: 'utf-8'});
        }
      }
    },
  };
}
