# Changlog

All notable changes to [rollup-plugin-import-maps](https://www.npmjs.com/package/rollup-plugin-import-maps) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.2.3] - 2020-06-21

### Fixed

+ Fixed module specifier with leading slash was resolved as filesystem path, now it is changed to be resolved as url pathname and won't be transformed.
+ Fixed resolving of dynamic import specifier which starts with `./` `../` or `/`



## [0.2.0] - 2020-06-07

### Added

+ `options.srcText` to use text as importmap source
+ `options.transformingReport` to save transforming report as a file
+ `options.noTransforming` to only mark specifiers defined in importmap as external without transforming
+ `options.exclude` to skip specifiers from resolving

### Changed

+ dropped use of `Buffer` as `options.srcObject`



## [0.1.1] - 2022-06-04

### Fixed

+ fixed resolving of protocol-relative target specifier like `//example.com/foo.js`

### Deprecated

+ use `Buffer` as `options.srcObject` is deprected



## [0.1.0] - 2022-06-02

### Added

+ speicifer transforming of import statement, export statement and dynamic import
