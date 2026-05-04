// =================================================================
// This file contains common functions for filters pane interactions and assertions.
// It is used in different modules, so it is placed in support/fragments for better reusability.
//
// DISCLAIMER: Tested on Acquisition filters panes, so some functions may require adjustments for other modules.
// Supported filter types:
//  - Checkbox,
//  - Date range,
//  - Select,
//  - Selection,
//  - MultiSelect;
// =================================================================

import {
  Button,
  Checkbox,
  including,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextField,
  ValueChipRoot,
} from '../../../interactors';
import { COMMON_BUTTON_LABELS, DATE_RANGE_FIELD_LABELS, LIST_ASSERTION_MODES } from '../constants';

const FILTER_ACCORDION_SELECTOR_ATTRIBUTE = 'data-cy-filters-pane-filter-accordion';
const RESET_BUTTON_SELECTOR_ATTRIBUTE = 'data-cy-filters-pane-reset-all-filters-button';
const ACCORDION_TOGGLE_SELECTOR = 'button[id*="accordion-toggle-button-"]';

const resetAllButton = Button({ text: COMMON_BUTTON_LABELS.RESET_ALL });

const findFilterSectionByLabel = (filtersPane, label) => filtersPane.find(Section({ label }));

/**
 * Common helper functions for filters pane interactions and assertions.
 *
 * All functions accept a `filtersPane` interactor as their first argument — typically a `Pane`,
 * `PaneContent`, or `Section` interactor scoped to the filters pane of the current module.
 * Filter IDs correspond to the `id` attribute of the accordion `<section>` elements in the DOM.
 *
 * @example
 * // Typical usage in a module-specific helper (e.g., orders.js):
 * import FiltersPane from '../filtersPane';
 * const ordersFiltersPane = Pane({ id: 'orders-filters-pane' });
 * FiltersPane.expandFilterAccordion(ordersFiltersPane, 'fundCode');
 * FiltersPane.filterByMultiSelectOptions(ordersFiltersPane, 'fundCode', ['FUND-A', 'FUND-B']);
 */
export default {
  /* --- Assertions --- */

  /**
   * Asserts the enabled/disabled state of the "Reset all" button in the filters pane.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {object} params
   * @param {boolean} params.disabled - Expected disabled state of the "Reset all" button.
   *
   * @example
   * FiltersPane.assertResetAllButtonState(ordersFiltersPane, { disabled: true });
   */
  assertResetAllButtonState(filtersPane, { disabled }) {
    cy.expect(filtersPane.find(resetAllButton).has({ disabled: disabled.toString() }));
  },

  /**
   * Asserts selected value chips of a MultiSelect filter.
   * When `values` is empty, asserts no chips are present.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} [values=[]] - Expected chip values. Pass empty array to assert no chips.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   * @param {string} [options.mode=LIST_ASSERTION_MODES.EXISTS] - Assertion mode: `'exists'` or `'absent'`.
   *
   * @example
   * FiltersPane.assertMultiSelectFilterValues(ordersFiltersPane, 'fundCode', ['FUND-A']);
   * FiltersPane.assertMultiSelectFilterValues(ordersFiltersPane, 'fundCode', []);
   */
  assertMultiSelectFilterValues(filtersPane, filterLabel, values = [], options = {}) {
    const { expandAccordion = true, mode = LIST_ASSERTION_MODES.EXISTS } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);

    if (values.length) {
      values.forEach((value) => {
        cy.expect(filterSection.find(MultiSelect()).find(ValueChipRoot(value))[mode]());
      });
    } else {
      cy.expect(filterSection.find(MultiSelect()).find(ValueChipRoot()).absent());
    }
  },

  /**
   * Opens a MultiSelect filter dropdown and asserts the available option values.
   * When `values` is empty, asserts no options are visible in the dropdown.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} [values=[]] - Option labels to assert (supports partial match via `including`).
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   * @param {string} [options.mode=LIST_ASSERTION_MODES.EXISTS] - Assertion mode: `'exists'` or `'absent'`.
   *
   * @example
   * FiltersPane.assertMultiSelectFilterOptionsValues(ordersFiltersPane, 'fundCode', ['FUND-A', 'FUND-B']);
   */
  assertMultiSelectFilterOptionsValues(filtersPane, filterLabel, values = [], options = {}) {
    const { expandAccordion = true, mode = LIST_ASSERTION_MODES.EXISTS } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);
    const filterMultiSelect = filterSection.find(MultiSelect());
    const filterMultiSelectDropdown = MultiSelectMenu();

    cy.do(filterMultiSelect.open());
    if (values.length) {
      values.forEach((value) => {
        cy.expect(filterMultiSelectDropdown.find(MultiSelectOption(including(value)))[mode]());
      });
    } else {
      cy.expect(filterMultiSelectDropdown.find(MultiSelectOption()).absent());
    }
  },

  /**
   * Asserts whether checkbox filter options are checked or unchecked.
   * Note: works as toggle assertion when called multiple times for the same option.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} labels - The visible labels of the checkbox options.
   * @param {object} [options={}]
   * @param {boolean} [options.checked=true] - Whether the checkboxes are expected to be checked or unchecked.
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.assertCheckboxFilterValues(ordersFiltersPane, 'approved', ['Yes'], { checked: true });
   */
  assertCheckboxFilterValues(filtersPane, filterLabel, labels, options = {}) {
    const { checked = true, expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    labels.forEach((label) => {
      cy.expect(
        findFilterSectionByLabel(filtersPane, filterLabel).find(Checkbox(label)).has({ checked }),
      );
    });
  },

  /**
   * Asserts the current value of a Select filter.
   * Expands the accordion first if it is not already expanded.
   * Note: this function only asserts the selected value, it does not assert the presence of the option in the dropdown.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string} value - The expected selected value label.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   */
  assertSelectFilterValue(filtersPane, filterLabel, value, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    cy.expect(findFilterSectionByLabel(filtersPane, filterLabel).find(Select()).has({ value }));
  },

  /**
   * Asserts the current value of a Selection (dropdown) filter.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string} value - The expected selected value label.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.assertSelectionFilterValue(ordersFiltersPane, 'poNumberPrefix', 'PREF-01');
   */
  assertSelectionFilterValue(filtersPane, filterLabel, value, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    cy.expect(
      findFilterSectionByLabel(filtersPane, filterLabel)
        .find(Selection())
        .has({ singleValue: value }),
    );
  },

  /**
   * Opens a Selection (dropdown) filter and asserts the available option values.
   * When `values` is empty, asserts no options are visible in the dropdown.
   * Note: this function only asserts the presence of options in the dropdown, it does not select them.
   * To select an option, use the `filterBySelectionOption` function.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} [values=[]] - Option labels to assert (supports partial match via `including`).
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.assertSelectionFilterOptionsValues(ordersFiltersPane, 'poNumberPrefix', ['PREF-01', 'PREF-02']);
   * FiltersPane.assertSelectionFilterOptionsValues(ordersFiltersPane, 'poNumberPrefix', []);
   */
  assertSelectionFilterOptionsValues(filtersPane, filterLabel, values = [], options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);
    const filterSelection = filterSection.find(Selection());
    const filterSelectionDropdown = SelectionList();

    cy.do(filterSelection.open());
    if (values.length) {
      values.forEach((value) => {
        cy.expect(filterSelectionDropdown.find(SelectionOption(including(value))).exists());
      });
    } else {
      cy.expect(filterSelectionDropdown.find(SelectionOption()).absent());
    }
  },

  /**
   * Asserts the start and/or end date values of a date range filter.
   * Pass only the fields you want to assert; omit the rest.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {object} dates
   * @param {string} [dates.from] - Expected value of the "start date" text field.
   * @param {string} [dates.to] - Expected value of the "end date" text field.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.assertDateRangeFilterValues(ordersFiltersPane, 'dateOrdered', { from: '12/01/2024', to: '12/31/2024' });
   */
  assertDateRangeFilterValues(filtersPane, filterLabel, { from, to } = {}, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);

    if (from !== undefined) {
      cy.expect(filterSection.find(TextField(DATE_RANGE_FIELD_LABELS.FROM)).has({ value: from }));
    }
    if (to !== undefined) {
      cy.expect(filterSection.find(TextField(DATE_RANGE_FIELD_LABELS.TO)).has({ value: to }));
    }
  },

  /* --- Filtering --- */

  /**
   * Clicks the clear (×) button for a specific filter accordion to remove all its applied values.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   *
   * @example
   * FiltersPane.clearFilter(ordersFiltersPane, 'fundCode');
   */
  clearFilter(filtersPane, filterLabel) {
    cy.do(
      findFilterSectionByLabel(filtersPane, filterLabel)
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  /**
   * Clicks the "Reset all" button in the filters pane to clear all applied filters.
   * By default, skips clicking if the button is already disabled (i.e., no filters are active).
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {object} [options={}]
   * @param {boolean} [options.skipDisabled=true] - Skip the click when the button is disabled.
   *
   * @example
   * FiltersPane.clearAllFilters(ordersFiltersPane);
   * FiltersPane.clearAllFilters(ordersFiltersPane, { skipDisabled: false });
   */
  clearAllFilters(filtersPane, options = {}) {
    const { skipDisabled = true } = options;

    cy.do(
      filtersPane.perform((el) => {
        const selectors = [
          'button[id*="reset"]',
          'button[data-testid*="reset"]',
          `button[aria-label*="${COMMON_BUTTON_LABELS.RESET_ALL}"]`,
          'button',
        ];

        const resetBtn = selectors
          .reduce((acc, selector) => (acc.length ? acc : [...el.querySelectorAll(selector)]), [])
          .find(({ textContent = '' }) => textContent.includes(COMMON_BUTTON_LABELS.RESET_ALL));

        resetBtn.setAttribute(RESET_BUTTON_SELECTOR_ATTRIBUTE, 'true');
      }),
    );

    cy.get(`[${RESET_BUTTON_SELECTOR_ATTRIBUTE}="true"]`)
      .should('exist')
      .then(($btn) => {
        if ($btn.is(':disabled') && skipDisabled) return;

        cy.wrap($btn).click();
      })
      .should('be.disabled')
      .invoke('removeAttr', RESET_BUTTON_SELECTOR_ATTRIBUTE);
  },

  /**
   * Selects one or more options in a MultiSelect filter and confirms they appear as value chips.
   * Note: works as toggle assertion when called multiple times for the same option.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} [selectOptions=[]] - Option labels to select.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.filterByMultiSelectOptions(ordersFiltersPane, 'fundCode', ['FUND-A', 'FUND-B']);
   */
  filterByMultiSelectOptions(filtersPane, filterLabel, selectOptions = [], options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);
    const filterMultiSelect = filterSection.find(MultiSelect());

    cy.expect(filterMultiSelect.exists());
    cy.do(filterMultiSelect.choose(selectOptions));
  },

  /**
   * Removes specific value chips from a MultiSelect filter and confirms each chip disappears.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} [chipValues=[]] - Chip labels to remove.
   *
   * @example
   * FiltersPane.removeMultiSelectChips(ordersFiltersPane, 'fundCode', ['FUND-A']);
   */
  removeMultiSelectChips(filtersPane, filterLabel, chipValues = []) {
    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);
    const filterMultiSelect = filterSection.find(MultiSelect());

    cy.expect(filterMultiSelect.exists());
    chipValues.forEach((value) => {
      cy.do(
        filterMultiSelect
          .find(ValueChipRoot(value))
          .find(Button({ icon: 'times' }))
          .click(),
      );
      cy.expect(filterMultiSelect.find(ValueChipRoot(value)).absent());
    });
  },

  /**
   * Clicks a checkbox option within a filter accordion to toggle its state and asserts the expected checked state.
   * Expands the accordion first if it is not already expanded.
   * Note: works as toggle assertion when called multiple times for the same option.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string[]} labels - The visible labels of the checkbox options to click.
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * // Select the "Yes" checkbox in the "Approved" filter
   * FiltersPane.filterByCheckboxes(ordersFiltersPane, 'approved', ['Yes']);
   */
  filterByCheckboxes(filtersPane, filterLabel, labels = [], options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    labels.forEach((label) => {
      cy.do(findFilterSectionByLabel(filtersPane, filterLabel).find(Checkbox(label)).click());
    });
  },

  /**
   * Selects an option from a Select filter and asserts the expected value is selected.
   * Expands the accordion first if it is not already expanded.
   * Note: this function only selects the option in the dropdown, it does not assert the presence of the option before selection.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string} value - The option label to select (partial match is supported).
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   */
  filterBySelect(filtersPane, filterLabel, value, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    cy.do(findFilterSectionByLabel(filtersPane, filterLabel).find(Select()).choose(value));
  },

  /**
   * Selects a value from a Selection (dropdown) filter.
   * Opens the dropdown, filters the list to the given value, then selects a matching option.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {string} value - The option label to select (partial match is supported).
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.filterBySelection(ordersFiltersPane, 'poNumberPrefix', 'PREF-01');
   */
  filterBySelection(filtersPane, filterLabel, value, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);

    cy.do([
      filterSection.find(Selection()).open(),
      SelectionList().filter(value),
      SelectionList().select(including(value)),
    ]);
  },

  /**
   * Fills in the start and/or end date fields of a date range filter and clicks "Apply".
   * Pass only the fields you want to set; omit the rest.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {object} dates
   * @param {string} [dates.from] - Date string to fill into the "start date" field (e.g., `'12/01/2024'`).
   * @param {string} [dates.to] - Date string to fill into the "end date" field (e.g., `'12/31/2024'`).
   * @param {object} [options={}]
   * @param {boolean} [options.expandAccordion=true] - Whether to expand the accordion first.
   *
   * @example
   * FiltersPane.filterByDateRange(ordersFiltersPane, 'dateOrdered', { from: '12/01/2024', to: '12/31/2024' });
   * FiltersPane.filterByDateRange(ordersFiltersPane, 'dateOrdered', { from: '01/01/2024' });
   */
  filterByDateRange(filtersPane, filterLabel, { from, to } = {}, options = {}) {
    const { expandAccordion = true } = options;

    if (expandAccordion) {
      this.expandFilterAccordion(filtersPane, filterLabel);
    }

    const filterSection = findFilterSectionByLabel(filtersPane, filterLabel);

    if (from !== undefined) {
      cy.do(filterSection.find(TextField(DATE_RANGE_FIELD_LABELS.FROM)).fillIn(from));
    }
    if (to !== undefined) {
      cy.do(filterSection.find(TextField(DATE_RANGE_FIELD_LABELS.TO)).fillIn(to));
    }

    cy.do(filterSection.find(Button(COMMON_BUTTON_LABELS.APPLY)).click());
  },

  /* --- Filter accordion status handlers --- */

  /**
   * Conditionally expands or collapses a filter accordion to match the desired state.
   * Uses a DOM attribute to locate the toggle button reliably across interactor boundaries.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   * @param {boolean} desiredExpanded - `true` to expand, `false` to collapse.
   *
   * @example
   * FiltersPane.setFilterAccordionExpanded(ordersFiltersPane, 'fundCode', true);
   */
  setFilterAccordionExpanded(filtersPane, filterLabel, desiredExpanded) {
    cy.do(
      findFilterSectionByLabel(filtersPane, filterLabel).perform((el) => {
        el.querySelector(ACCORDION_TOGGLE_SELECTOR).setAttribute(
          FILTER_ACCORDION_SELECTOR_ATTRIBUTE,
          filterLabel,
        );
      }),
    );

    cy.get(`[${FILTER_ACCORDION_SELECTOR_ATTRIBUTE}="${filterLabel}"]`)
      .should('exist')
      .then(($btn) => {
        if (JSON.parse($btn.attr('aria-expanded')) !== desiredExpanded) {
          cy.wrap($btn).click().should('have.attr', 'aria-expanded', desiredExpanded.toString());
        }
      });
  },

  /**
   * Expands a filter accordion if it is not already expanded.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   *
   * @example
   * FiltersPane.expandFilterAccordion(ordersFiltersPane, 'fundCode');
   */
  expandFilterAccordion(filtersPane, filterLabel) {
    this.setFilterAccordionExpanded(filtersPane, filterLabel, true);
  },

  /**
   * Collapses a filter accordion if it is not already collapsed.
   *
   * @param {Interactor} filtersPane - Interactor scoped to the filters pane.
   * @param {string} filterLabel - The visible label of the filter's accordion section element.
   *
   * @example
   * FiltersPane.collapseFilterAccordion(ordersFiltersPane, 'fundCode');
   */
  collapseFilterAccordion(filtersPane, filterLabel) {
    this.setFilterAccordionExpanded(filtersPane, filterLabel, false);
  },
};
