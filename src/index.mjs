/* eslint-env node */
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { resolve, parseFromString } from 'import-maps';
import { validate } from 'schema-utils';
// import schema from './schema.json' assert {type:'json'};
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(path.resolve(__dirname, '../src/schema.json'), {encoding:'utf8'}));

let validateRollupConfig = (rollupConfig, srcObject) => {
  let {external:isExternal} = rollupConfig;
  let checkSpecifiers = (imports) => {
    Object.keys(imports).forEach((specifier) => {
      if(isExternal(specifier)){
        console.warn('specifier "' + specifier + '" is already in rollup config external list');
      }
    });
  };
  checkSpecifiers(srcObject.imports);
  let {scopes} = srcObject;
  if(scopes){
    Object.keys(scopes).forEach((prefix) => {
      checkSpecifiers(scopes[prefix]);
    });
  }
};

let isBareSpecifier = (str) => {
  return !(/^(\.\.?\/|\/)/.test(str) || /(https?:\/\/|data:|file:\/\/)/.test(str));
};

export function importMapsPlugin(options) {
  validate(schema, options, {
    name: 'rollup-plugin-import-maps',
    baseDataPath: 'options'
  });
  const fakeBaseURL = 'https://fakepath';
  let {srcObject, srcPath, baseDir} = options;

  let rawImportMaps = null;
  if(srcObject instanceof Buffer || srcObject instanceof ArrayBuffer || typeof srcObject === 'object'){
    // read buffer on buildStart
  }else if(typeof srcPath === 'string'){
    // read file on buildStart
  }else{
    throw new Error('Either srcObject or srcPath should be specified in options');
  }
  let parsedImportMaps = null;
  if(baseDir){
    baseDir = path.resolve(baseDir);
  }
  let cache = {};
  let getFakeURL = (scriptFile) => {
    let scriptURL = cache[scriptFile];
    if(!scriptURL){
      let scriptPath = path.relative(baseDir, scriptFile).replace(/\\/g, () => '/');
      scriptURL = new URL(scriptPath, fakeBaseURL);
      cache[scriptFile] = scriptURL;
    }
    return scriptURL;
  };
  let rollupConfig;

  return {
    name: 'import-maps',
    async buildStart(config) {
      if(srcObject instanceof Buffer){
        rawImportMaps = srcObject.toString('utf8');
      }else if(srcObject instanceof ArrayBuffer){
        rawImportMaps = Buffer.from(srcObject).toString('utf8');
      }else if(typeof srcObject === 'object'){
        rawImportMaps = JSON.stringify(srcObject, null, 2);
      }else if(srcPath){
        if(!existsSync(srcPath)){
          throw new Error(`options.srcPath "${srcPath}" doesn't denote a file`);
        }
        rawImportMaps = readFileSync(srcPath, {encoding:'utf8'});
      }
      parsedImportMaps = parseFromString(rawImportMaps, fakeBaseURL);
      validateRollupConfig(config, parsedImportMaps);
      if(!baseDir){
        baseDir = process.cwd();
      }
      rollupConfig = config;
    },
    resolveId(source, importer, info) {
      if(info.isEntry){
        return null;
      }
      if(isBareSpecifier(source) && importer){
        if(rollupConfig.external(source)){
          // console.warn(`skip specifier "${source}" from import-maps processing`);
          return null;
        }
        let scriptURL = getFakeURL(importer);
        const parsedUrl = resolve(source, parsedImportMaps, scriptURL);
        let finalSpecifier = parsedUrl.origin === fakeBaseURL ? parsedUrl.href.slice(fakeBaseURL.length) :
          parsedUrl.href;
        return {
          id: finalSpecifier,
          external: 'absolute', // boolean or 'relative', 'absolute'
        };
      }
      return null;
    },
  };
}
