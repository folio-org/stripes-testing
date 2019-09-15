# Change history for stripes-testing

## [1.6.#](https://github.com/folio-org/stripes-testing/tree/v1.6.3) (2019-09-15)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.2...v1.6.3)

* Rework new-item form to be more reliable.

## [1.6.2](https://github.com/folio-org/stripes-testing/tree/v1.6.2) (2019-09-09)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.1...v1.6.2)

* Update selector for create-item form.
* Interact with text-fields after select-fields to force blur-validation to fire. Refs UIIN-671
* Update new-item form to use `copyNumbers` as an array, not a scalar.

## [1.6.1](https://github.com/folio-org/stripes-testing/tree/v1.6.1) (2019-07-26)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.0...v1.6.1)

* Correctly implement `setCirculationRules` allowing the caller to resolve its promise.  Fixes UITEST-67.

## [1.6.0](https://github.com/folio-org/stripes-testing/tree/v1.6.0) (2019-07-07)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.5.0...v1.6.0)

* Remove `xclick`; it was too likely to confound Nightmare.
* Add `checkout` and `setCirculationRules` helpers.
* Bump Nightmare to 3.0.2 to avoid security issues.

## [1.5.0](https://github.com/folio-org/stripes-testing/tree/v1.5.0) (2019-05-15)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.4.0...v1.5.0)

* `openApp` uses nav-menu
* `setUsEnglishLocale` uses tenant-settings, replacing organization
* Optional `wait` param for `clickSettings`

## [1.4.0](https://github.com/folio-org/stripes-testing/tree/v1.4.0) (2019-05-14)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.3.0...v1.4.0)

* Optional `wait` param for `clickApp`

## [1.3.0](https://github.com/folio-org/stripes-testing/tree/v1.3.0) (2019-05-13)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.2.0...v1.3.0)

* New helpers: set locale, nav-menu app-switcher, add-user, grant-permissions.
* New test guidelines: only interact with the DOM via Nightmare scope.
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
