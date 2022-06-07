export default {
  inputFile: 'spec/fixtures/no-transforming/in.js',
  importmapFile: 'spec/fixtures/no-transforming/in.importmap',
  expectedOutputFile: 'spec/fixtures/no-transforming/out.js',
  pluginOptions: {
    noTransforming: true,
  },
};
