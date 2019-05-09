# Change history for stripes-testing

## 1.3.0 (IN PROGRESS)

* Remove unused mocha deps. Refs STCOR-611.

## [1.2.0](https://github.com/folio-org/stripes-testing/tree/v1.2.0) (2019-03-15)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.1.0...v1.2.0)

* Update integration tests to accommodate MCL aria changes. Fixes UITEST-58.
* Update integration tests to use always-available settings button. Refs STRIPES-606.
* Use the most-current, but still-oldish, version of Nightmare, 3.0.1.

## [1.1.0](https://github.com/folio-org/stripes-testing/tree/v1.1.0) (2018-11-30)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.0.1...v1.1.0)

* Upgrade `debug` dependency, STRIPES-553
* New `.input(selector, stringToType)` action
* Initial support for coverage reporting, UITEST-39

## [1.0.1](https://github.com/folio-org/stripes-testing/tree/v1.0.1) (2018-09-17)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.0.0...v1.0.1)

* Set required field `hrid` to unique value, fixes UITEST-50

## [1.0.0](https://github.com/folio-org/stripes-testing/tree/v1.0.0) (2018-09-10)

* Initial copy from ui-testing.  See [ui-testing's changelog](https://github.com/folio-org/ui-testing/blob/2a604a6698f6e0d32e68ed8e566c7bfbefa75e92/CHANGELOG.md) for prior history.
* Remove UI module dependencies and tests, resolves UITEST-47 and related to UITEST-22
