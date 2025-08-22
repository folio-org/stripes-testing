# Change history for stripes-testing

## 5.1.0 IN PROGRESS
* Export the Applist interactor.
* Removed alerts and reporting codes. Refs MODORDERS-1269.
* Use MessageBanner stripes component for user patron blocks warning. Update its message. Refs UITEST-136.
* Update label for 38 position of MARC authority "008" field to "Mod Rec". Refs FAT-21567.

## [5.0.0](https://github.com/folio-org/stripes-testing/tree/v5.0.0) (2025-02-24)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.8.0...v5.0.0)

- Change `advanced-search` -> `fillQuery` interactor from `ariaLabel` to `dataTestID`. Refs UITEST-127.
- *BREAKING* upgrade `@folio/eslint-config-stripes`

## [4.8.0](https://github.com/folio-org/stripes-testing/tree/v4.8.0) (2024-11-01)
[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.7.0...v4.8.0)

- Updated Call Number search option labels. Refs FAT-13489.
- Update `<MultiSelection>` interactor. Refs STCOM-1304.
- Hide call number type options for Local, Other scheme, and SuDoc. Refs FAT-16052.
- Change the labels of the Classification and Call number sections in Inventory browse options. Refs FAT-16040.
- Migrate imports from `bigtest` to `@interactors/html`. Refs UITEST-120.
- Refactor ui-inventory permissions. Refs UITEST-121.
- Rename the `ui-eholdings.titles-packages.create-delete` and `ui-eholdings.package-title.select-unselect` permissions. Refs UITEST-123.
- Rename the `ui-notes.item.assign-unassign` permission. Refs UITEST-124.
- Update `ui-quick-marc.quick-marc-editor.duplicate` and `ui-quick-marc.quick-marc-authority-records.linkUnlink` permissions. Refs UITEST-121.

## [4.7.0](https://github.com/folio-org/stripes-testing/tree/v4.7.0) (2024-03-12)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.6.0...v4.7.0)

- Updated `<AdvancedSearch>` interactor for search match support. Updated e2e tests. Refs UITEST-111.
- Added support for `shiftKey` in keyboard presses. Refs UITEST-116.
- Added support for clear icon in `<TextArea>` interactor. Refs UITEST-118.

## [4.6.0](https://github.com/folio-org/stripes-testing/tree/v4.6.0) (2023-10-11)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.5.0...v4.6.0)

- Export some `@bigtest/react` functions. Refs UITEST-108.
- Bump Cypress from v10 to v12. FAT-7403.

## [4.5.0](https://github.com/folio-org/stripes-testing/tree/v4.5.0) (2023-02-01)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.4.0...v4.5.0)

- Implement many e-2-e automation tests.
- `<Textarea>` interactor: add `cols` selector. Refs STCOM-1101.

## [4.4.0](https://github.com/folio-org/stripes-testing/tree/v4.4.0) (2022-10-13)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.3.0...v4.4.0)

- Update circulationLoanHistoryPath. Refs UITEST-100
- Implement e-2-e automation of test case C465. Refs FAT-797.
- Implement e-2-e automation of test case C347828. Refs FAT-1296.
- Implement e-2-e automation of test case C17017. Refs FAT-1288.
- `<CheckboxInTable>` interactor.
- `<Image>` interactor.
- `<ConfirmationModal>` interactor.

## [4.3.0](https://github.com/folio-org/stripes-testing/tree/v4.3.0) (2022-06-14)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.2.0...v4.3.0)

- Fix AdvancedSearch search option select interactor. Refs UITEST-89.
- `<NoValue>` interactor. Refs STCOM-936.
- Implement e-2-e automation of test case C598. Refs FAT-812.
- Implement e-2-e automation of test case C1294. Refs FAT-817.
- Implement e-2-e automation of test case C15850. Refs FAT-823.
- Implement e-2-e automation of test case C747. Refs FAT-890.
- Implement e-2-e automation of test case C3501. Refs FAT-821.
- Implement e-2-e automation of test case C556. Refs FAT-889.
- Implement e-2-e automation of test case C9215. Refs FAT-816.
- Implement e-2-e automation of test case C2379. Refs FAT-891.
- Implement e-2-e automation of test case C11081: Refs FAT-820.
- Implement e-2-e automation of test case C540. Refs FAT-887.
- Implement e-2-e automation of test case C714. Refs FAT-818.
- Implement e-2-e automation of test case C10930. Refs FAT-819.
- Implement e-2-e automation of test case C343215. Refs FAT-1626.
- Implement e-2-e automation of test case C347825. Refs FAT-869.
- Implement e-2-e automation of test case C641. Refs FAT-732.
- Implement e-2-e automation of test case C2268. Refs FAT-1454.
- Implement e-2-e automation of test case C350616. Refs FAT-1590.
- Implement e-2-e automation of test case C546. Refs FAT-888.
- Implement e-2-e automation of test case C568. Refs FAT-841.
- Implement e-2-e automation of test case C9191. Refs FAT-838.
- Implement e-2-e automation of test case C350616. Refs FAT-1666.
- "Override" button permission issue inside Renew Confirmation modal. Refs FAT-1856.

## [4.2.0](https://github.com/folio-org/stripes-testing/tree/v4.2.0) (2022-02-11)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v4.0.0...v4.2.0)

- Implement e-2-e automation of test case C4059. Refs FAT-810.
- Implement e-2-e automation of test case C4061. Refs FAT-807.
- Export `dispatchFocusout` from `util` so that other Interactors can make use of it. Refs STSMACOM-541.
- Add `AddressEdit, AddressList` interactors. Refs STSMACOM-608.
- Implement e-2-e automation of test case C11112. Refs FAT-758.
- Add `cypress-grep` plugin to be able to run tests by tags. Refs FAT-1090.
- Implement e-2-e automation of test case C11113. Refs FAT-759.
- Add `AdvancedSearch` interactor. Refs UITEST-89.
- Implement e-2-e automation of test case C343343. Refs FAT-757.
- Implement e-2-e automation of test case C17044. Refs FAT-756.

## [4.0.0](https://github.com/folio-org/stripes-testing/tree/v4.0.0) (2021-09-27)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v3.0.0...v4.0.0)

- Introduce Cypress e2e tests with new BigTest. FOLIO-2946.
- Introduce e2e tests with Cypress. FAT-899.
- Write e2e tests with interactors.
- Use element.textContent over element.innerText due to lack of compatibility with JS-DOM.

## [3.0.0](https://github.com/folio-org/stripes-testing/tree/v3.0.0) (2021-03-18)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v2.0.1...v3.0.0)

- Remove NightmareJS.
- Export interactors.

## [2.0.1](https://github.com/folio-org/stripes-testing/tree/v2.0.1) (2020-06-10)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v2.0.0...v2.0.1)

- instance- and item-record save buttons have moved to the footer
- update `<a>` in `<MCL>`. Refs FOLIO-2569.
- `<MCL>` default formatter no longer includes `role="row"`. STCOM-677.

## [2.0.0](https://github.com/folio-org/stripes-testing/tree/v2.0.0) (2020-04-07)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.7.0...v2.0.0)

- open closed accordions to find their buttons. Refs UITEST-71
- Upgrade eslint to v6.2.1. Refs UXPROD-2240
- Add policy helpers. Refs FOLIO-2440
- provide non-zero overdue values. Refs CIRC-664
- click the correct accordion. UITEST-74
- click the `close` button in callouts to proceed more quickly

## [1.7.0](https://github.com/folio-org/stripes-testing/tree/v1.7.0) (2019-12-04)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.7...v1.7.0)

- export `findActiveUserBarcode` to find a barcode for a user in a given group. Refs UIU-897.
- export `createNInventory` to create N item records under a single instance record.
- export `checkoutList` to charge many items to a single user.
- update tests to work with new stripes-core navigation menu. Refs STCOR-377.

## [1.6.7](https://github.com/folio-org/stripes-testing/tree/v1.6.7) (2019-09-26)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.6...v1.6.7)

- Be more semantic in MCL selectors; a row is not always a `<div>`.

## [1.6.6](https://github.com/folio-org/stripes-testing/tree/v1.6.6) (2019-09-16)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.5...v1.6.6)

- Avoid the copy-number field in the new-item helper for historical reasons. Refs FOLIO-2248, UITEST-68.

## [1.6.5](https://github.com/folio-org/stripes-testing/tree/v1.6.5) (2019-09-16)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.4...v1.6.5)

- Prefer semantic over markup selectors; they are maaaaybe more reliable. Refs UITEST-69.
- Wait for timeouts in addition to waiting for selectors. It's the only way. Refs UITEST-69.

## [1.6.4](https://github.com/folio-org/stripes-testing/tree/v1.6.4) (2019-09-16)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.3...v1.6.4)

- Rework new-item helper, yet again, to be more reliable. Grrrr. Refs UITEST-69.

## [1.6.3](https://github.com/folio-org/stripes-testing/tree/v1.6.3) (2019-09-15)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.2...v1.6.3)

- Rework new-item form to be more reliable.

## [1.6.2](https://github.com/folio-org/stripes-testing/tree/v1.6.2) (2019-09-09)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.1...v1.6.2)

- Update selector for create-item form.
- Interact with text-fields after select-fields to force blur-validation to fire. Refs UIIN-671
- Update new-item form to use `copyNumbers` as an array, not a scalar.

## [1.6.1](https://github.com/folio-org/stripes-testing/tree/v1.6.1) (2019-07-26)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.6.0...v1.6.1)

- Correctly implement `setCirculationRules` allowing the caller to resolve its promise. Fixes UITEST-67.

## [1.6.0](https://github.com/folio-org/stripes-testing/tree/v1.6.0) (2019-07-07)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.5.0...v1.6.0)

- Remove `xclick`; it was too likely to confound Nightmare.
- Add `checkout` and `setCirculationRules` helpers.
- Bump Nightmare to 3.0.2 to avoid security issues.

## [1.5.0](https://github.com/folio-org/stripes-testing/tree/v1.5.0) (2019-05-15)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.4.0...v1.5.0)

- `openApp` uses nav-menu
- `setUsEnglishLocale` uses tenant-settings, replacing organization
- Optional `wait` param for `clickSettings`

## [1.4.0](https://github.com/folio-org/stripes-testing/tree/v1.4.0) (2019-05-14)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.3.0...v1.4.0)

- Optional `wait` param for `clickApp`

## [1.3.0](https://github.com/folio-org/stripes-testing/tree/v1.3.0) (2019-05-13)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.2.0...v1.3.0)

- New helpers: set locale, nav-menu app-switcher, add-user, grant-permissions.
- New test guidelines: only interact with the DOM via Nightmare scope.
- Remove unused mocha deps. Refs STCOR-611.

## [1.2.0](https://github.com/folio-org/stripes-testing/tree/v1.2.0) (2019-03-15)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.1.0...v1.2.0)

- Update integration tests to accommodate MCL aria changes. Fixes UITEST-58.
- Update integration tests to use always-available settings button. Refs STRIPES-606.
- Use the most-current, but still-oldish, version of Nightmare, 3.0.1.

## [1.1.0](https://github.com/folio-org/stripes-testing/tree/v1.1.0) (2018-11-30)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.0.1...v1.1.0)

- Upgrade `debug` dependency, STRIPES-553
- New `.input(selector, stringToType)` action
- Initial support for coverage reporting, UITEST-39

## [1.0.1](https://github.com/folio-org/stripes-testing/tree/v1.0.1) (2018-09-17)

[Full Changelog](https://github.com/folio-org/stripes-testing/compare/v1.0.0...v1.0.1)

- Set required field `hrid` to unique value, fixes UITEST-50

## [1.0.0](https://github.com/folio-org/stripes-testing/tree/v1.0.0) (2018-09-10)

- Initial copy from ui-testing. See [ui-testing's changelog](https://github.com/folio-org/ui-testing/blob/2a604a6698f6e0d32e68ed8e566c7bfbefa75e92/CHANGELOG.md) for prior history.
- Remove UI module dependencies and tests, resolves UITEST-47 and related to UITEST-22
