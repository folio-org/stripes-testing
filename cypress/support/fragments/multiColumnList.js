import {
  Button,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
} from '../../../interactors';
import { COMMON_BUTTON_LABELS, SORT_DIRECTIONS } from '../constants';

const defaultNormalizeValue = (value) => `${value}`.replace(/\s+/g, ' ').trim();

const defaultGetSortableValue = (value) => {
  return typeof value === 'string' ? value.toLowerCase() : value;
};

const defaultComparator = (leftValue, rightValue) => {
  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }

  return `${leftValue}`.localeCompare(`${rightValue}`, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const getSortedValues = (
  values,
  direction = SORT_DIRECTIONS.ASCENDING,
  comparator = defaultComparator,
) => {
  const sortedValues = [...values].sort(comparator);

  return direction === SORT_DIRECTIONS.DESCENDING ? sortedValues.reverse() : sortedValues;
};

const scrollHeaderIntoView = (listInteractor, column) => {
  cy.do(listInteractor.scrollHeaderIntoView(column));
};

const getPaginationButton = (listInteractor, label) => listInteractor.find(Button(label));

const getNextButton = (listInteractor) => getPaginationButton(listInteractor, COMMON_BUTTON_LABELS.NEXT);

const getPreviousButton = (listInteractor) => getPaginationButton(listInteractor, COMMON_BUTTON_LABELS.PREVIOUS);

// When multi-column list doesn't have a loading indicator, and the Next or Previous
// button is clicked, we wait for the first row to change, not for the loading to complete.
const waitFirstRowChanged = (listInteractor) => {
  const getFirstRowContent = (el) => el.querySelector('[data-row-index]')?.textContent;

  return cy
    .then(() => listInteractor.perform(getFirstRowContent))
    .should((prevContent) => listInteractor.perform((el) => {
      const currentContent = getFirstRowContent(el);
      if (!prevContent || !currentContent || currentContent === prevContent) {
        throw new Error('Page has not changed yet');
      }
    }));
};

/**
 * Minimal contract for an Interactor used by list helper methods.
 *
 * @typedef {Object} ListInteractor
 * @property {(interactor: Object<string, *>) => ListInteractor} find - Finds nested interactor.
 * @property {(attrs: Object<string, *>) => ListInteractor} has - Checks interactor attributes.
 */

/**
 * Expected state for a cell existence assertion.
 *
 * @typedef {boolean} CellExistsFlag
 */

/**
 * Configuration for a single expected cell in a row.
 *
 * Any properties except exists are forwarded to MultiColumnListCell.
 * Typical keys are column and content.
 *
 * @typedef {Object} ExpectedCell
 * @property {CellExistsFlag} [exists=true] - true checks that cell exists, false checks that cell is absent.
 * @property {string} [column] - Column label or identifier accepted by MultiColumnListCell.
 * @property {string|number} [content] - Expected cell content.
 */

/**
 * Explicit row configuration.
 *
 * @typedef {Object} ExplicitRowConfig
 * @property {number} [rowIndex=0] - Zero-based row index.
 * @property {ExpectedCell[]} [expectedCells=[]] - Cells to assert for this row.
 */

/**
 * Row configuration in compact format where outer array index is row index.
 *
 * @typedef {ExpectedCell[][]} IndexedRowsConfig
 */

/**
 * Row configuration in explicit format for sparse/non-sequential rows.
 *
 * @typedef {ExplicitRowConfig[]} ExplicitRowsConfig
 */

/**
 * Supported argument type for rows assertion.
 *
 * @typedef {ExplicitRowConfig|IndexedRowsConfig|ExplicitRowsConfig|null|undefined} RowsConfig
 *
 * @example
 * // Contract 1: single explicit row
 * const singleRow = {
 *   rowIndex: 0,
 *   expectedCells: [
 *     { column: 'Type', content: 'Payment' },
 *     { column: 'Source', content: 'Invoice' },
 *   ],
 * };
 *
 * @example
 * // Contract 2: array of arrays (outer index === row index)
 * const indexedRows = [
 *   [{ column: 'Type', content: 'Allocation' }],
 *   [{ column: 'Type', content: 'Transfer' }],
 * ];
 *
 * @example
 * // Contract 3: sparse rows with explicit indexes
 * const sparseRows = [
 *   { rowIndex: 1, expectedCells: [{ column: 'Type', content: 'Credit' }] },
 *   { rowIndex: 5, expectedCells: [{ column: 'Type', content: 'Payment' }] },
 * ];
 */

/**
 * Common helper methods for MultiColumnList assertions.
 *
 * @typedef {Object} MultiColumnListApi
 * @property {(listInteractor: ListInteractor) => Cypress.Chainable<void>} waitLoadingComplete
 * @property {(listInteractor: ListInteractor, rowCount: number) => void} assertRowCount
 * @property {(listInteractor: ListInteractor, columns: string[]) => void} assertColumns
 * @property {(listInteractor: ListInteractor, column: string) => void} sortListBy
 * @property {(column: string, sortDirection?: string) => void} assertColumnSortDirection
 * @property {(listInteractor: ListInteractor, column: string, isSortable?: boolean) => void} assertColumnSortable
 * @property {(listInteractor: ListInteractor, column: string, options?: {normalizeValue?: Function}) => Cypress.Chainable<string[]>} getColumnValues
 * @property {(listInteractor: ListInteractor, column: string, options?: {direction?: string, normalizeValue?: Function, getSortableValue?: Function, comparator?: Function, filterValues?: Function }) => Cypress.Chainable<void> } assertColumnValuesSorted
 * @property {(listInteractor: ListInteractor, column: string, options?: {normalizeValue?: Function, getSortableValue?: Function, comparator?: Function}) => Cypress.Chainable<void>} assertColumnValuesNotSorted
 * @property {(listInteractor: ListInteractor, rowsConfig?: RowsConfig) => void} assertRowsCellsContent
 * @property {(listInteractor: ListInteractor, isEnabled: boolean) => void} assertNextPageButtonEnabled
 * @property {(listInteractor: ListInteractor, isEnabled: boolean) => void} assertPreviousPageButtonEnabled
 * @property {(listInteractor: ListInteractor) => Cypress.Chainable<void>} clickNextPage
 * @property {(listInteractor: ListInteractor) => Cypress.Chainable<void>} clickPreviousPage
 * @property {(listInteractor: ListInteractor) => Cypress.Chainable<void>} navigateToLastPage
 * @property {(listInteractor: ListInteractor) => Cypress.Chainable<void>} navigateToFirstPage
 * @property {(listInteractor: ListInteractor, expectedText: string) => void} assertPagingText
 */

/** @type {MultiColumnListApi} */
const api = {
  /**
   * Waits until list loading indicator is disabled.
   *
   * @param {ListInteractor} listInteractor - Target multi-column list interactor.
   * @returns {Cypress.Chainable<void>}
   *
   * @example
   * import { MultiColumnList } from '../../../interactors';
   *
   * const transactionsList = MultiColumnList({ id: 'transactions-list' });
   * api.waitLoadingComplete(transactionsList);
   */
  waitLoadingComplete(listInteractor) {
    return cy.expect(listInteractor.has({ loading: false }));
  },

  assertRowCount(listInteractor, rowCount) {
    cy.expect(listInteractor.has({ rowCount }));
  },

  assertColumns(listInteractor, columns) {
    cy.expect(listInteractor.has({ columns }));
  },

  sortListBy(listInteractor, column) {
    scrollHeaderIntoView(listInteractor, column);
    cy.do(listInteractor.find(MultiColumnListHeader(column)).click());
    this.waitLoadingComplete(listInteractor);
  },

  /**
   * Asserts current sort direction for a given list column.
   *
   * @param {string} column - Column header label used by MultiColumnListHeader.
   * @param {string} [sortDirection=SORT_DIRECTIONS.DESCENDING] - Expected sort direction.
   * @returns {void}
   *
   * @example
   * import { TRANSACTION_LIST_COLUMNS, SORT_DIRECTIONS } from '../constants';
   *
   * api.assertColumnSortDirection(TRANSACTION_LIST_COLUMNS.TRANSACTION_DATE);
   * api.assertColumnSortDirection(TRANSACTION_LIST_COLUMNS.TRANSACTION_DATE, SORT_DIRECTIONS.ASCENDING);
   */
  assertColumnSortDirection(listInteractor, column, sortDirection = SORT_DIRECTIONS.DESCENDING) {
    scrollHeaderIntoView(listInteractor, column);
    cy.expect(listInteractor.find(MultiColumnListHeader(column)).has({ sort: sortDirection }));
  },

  assertColumnSortable(listInteractor, column, isSortable = true) {
    scrollHeaderIntoView(listInteractor, column);
    cy.expect(listInteractor.find(MultiColumnListHeader(column)).has({ sortable: isSortable }));
  },

  getColumnValues(listInteractor, column, options = {}) {
    const { normalizeValue = defaultNormalizeValue } = options;

    return cy.then(() => listInteractor.perform((el) => {
      const headers = [...el.querySelectorAll('div[class*=mclHeader-]')];
      const colIndex = headers.findIndex((h) => h.textContent.trim() === column) + 1;
      return [
        ...el.querySelectorAll(`[data-row-index] div[class*=mclCell-]:nth-child(${colIndex})`),
      ].map((cell) => normalizeValue(cell.textContent));
    }));
  },

  assertColumnValuesSorted(listInteractor, column, options = {}) {
    const {
      direction = SORT_DIRECTIONS.ASCENDING,
      normalizeValue = defaultNormalizeValue,
      getSortableValue = defaultGetSortableValue,
      comparator = defaultComparator,
      filterValues = null,
    } = options;

    this.getColumnValues(listInteractor, column, { normalizeValue }).then((allValues) => {
      const values =
        typeof filterValues === 'function' ? allValues.filter(filterValues) : allValues;
      const sortableValues = values.map(getSortableValue);
      const expectedValues = getSortedValues(sortableValues, direction, comparator);
      expect(
        sortableValues,
        `Column "${column}" values are not sorted in ${direction} order`,
      ).to.deep.equal(expectedValues);
    });
  },

  assertColumnValuesNotSorted(listInteractor, column, options = {}) {
    const {
      normalizeValue = defaultNormalizeValue,
      getSortableValue = defaultGetSortableValue,
      comparator = defaultComparator,
    } = options;
    return this.getColumnValues(listInteractor, column, { normalizeValue }).then((values) => {
      const sortableValues = values.map(getSortableValue);
      expect(
        sortableValues,
        `Column "${column}" values should not be sorted in ${SORT_DIRECTIONS.ASCENDING} order`,
      ).to.not.deep.equal(getSortedValues(sortableValues, SORT_DIRECTIONS.ASCENDING, comparator));
      expect(
        sortableValues,
        `Column "${column}" values should not be sorted in ${SORT_DIRECTIONS.DESCENDING} order`,
      ).to.not.deep.equal(getSortedValues(sortableValues, SORT_DIRECTIONS.DESCENDING, comparator));
    });
  },

  /**
   * Asserts cells for one or multiple rows in a multi-column list.
   *
   * Supported rowsConfig contracts:
   * 1. Single object: one explicit row config.
   * 2. Array of arrays: outer index equals row index.
   * 3. Array of objects: explicit row indexes for each row config.
   *
   * @param {ListInteractor} listInteractor - Target multi-column list interactor.
   * @param {RowsConfig} [rowsConfig=[]] - Rows/cells configuration.
   * @returns {void}
   *
   * @example
   * import { MultiColumnList } from '../../../interactors';
   *
   * const transactionsList = MultiColumnList({ id: 'transactions-list' });
   *
   * // Contract 1: single explicit row
   * api.assertRowsCellsContent(transactionsList, {
   *   rowIndex: 0,
   *   expectedCells: [
   *     { column: 'Type', content: 'Pending payment' },
   *     { column: 'Source', content: 'Invoice' },
   *   ],
   * });
   *
   * // Contract 2: indexed rows (0, 1, 2...)
   * api.assertRowsCellsContent(transactionsList, [
   *   [{ column: 'Type', content: 'Pending payment' }],
   *   [{ column: 'Type', content: 'Payment' }],
   * ]);
   *
   * // Contract 3: sparse explicit rows
   * api.assertRowsCellsContent(transactionsList, [
   *   { rowIndex: 1, expectedCells: [{ column: 'Type', content: 'Credit' }] },
   *   { rowIndex: 4, expectedCells: [{ column: 'Type', content: 'Encumbrance' }] },
   * ]);
   *
   * // Existence check: assert that a cell is absent
   * api.assertRowsCellsContent(transactionsList, {
   *   rowIndex: 0,
   *   expectedCells: [
   *     { column: 'Source', content: 'Invoice', exists: false },
   *   ],
   * });
   */
  assertRowsCellsContent(listInteractor, rowsConfig = []) {
    /**
     * Asserts expected cells for a specific row index.
     *
     * @param {ExpectedCell[]} expectedCells - Expected cells for the row.
     * @param {number} rowIndex - Zero-based row index.
     * @returns {void}
     */
    const assertCellsForRow = (expectedCells, rowIndex) => {
      const targetRow = listInteractor.find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }));

      expectedCells.forEach(({ exists = true, ...cellConfig }) => {
        cy.expect(targetRow.find(MultiColumnListCell(cellConfig))[exists ? 'exists' : 'absent']());
      });
    };

    if (!rowsConfig) {
      return;
    }

    // Contract 1: single object config is treated as a single row.
    // { rowIndex: 3, expectedCells: [...] }
    if (!Array.isArray(rowsConfig) && typeof rowsConfig === 'object') {
      const { rowIndex = 0, expectedCells = [] } = rowsConfig;
      assertCellsForRow(expectedCells, rowIndex);
      return;
    }

    if (!Array.isArray(rowsConfig) || rowsConfig.length === 0) {
      return;
    }

    const [firstItem] = rowsConfig;

    // Contract 2: array of arrays, index in outer array = row index.
    if (Array.isArray(firstItem)) {
      rowsConfig.forEach((expectedCells, rowIndex) => {
        assertCellsForRow(expectedCells, rowIndex);
      });
      return;
    }

    // Contract 3: array of objects with explicit rowIndex.
    // [{ rowIndex: 3, expectedCells: [...] }, { rowIndex: 7, expectedCells: [...] }]
    rowsConfig.forEach(({ rowIndex, expectedCells }) => {
      assertCellsForRow(expectedCells, rowIndex);
    });
  },

  /* Pagination */
  assertPaginationControlsDisabled(listInteractor, state) {
    const { previous, next } = state || { previous: true, next: true };

    this.assertPreviousPageButtonEnabled(listInteractor, !previous);
    this.assertNextPageButtonEnabled(listInteractor, !next);
  },

  assertNextPageButtonEnabled(listInteractor, isEnabled) {
    getNextButton(listInteractor).has({ disabled: !isEnabled });
  },

  assertPreviousPageButtonEnabled(listInteractor, isEnabled) {
    getPreviousButton(listInteractor).has({ disabled: !isEnabled });
  },

  clickNextPage(listInteractor, { hasLoadingIndicator = true } = {}) {
    return cy.do(getNextButton(listInteractor).click()).then(() => {
      return hasLoadingIndicator
        ? this.waitLoadingComplete(listInteractor)
        : waitFirstRowChanged(listInteractor);
    });
  },

  clickPreviousPage(listInteractor, { hasLoadingIndicator = true } = {}) {
    return cy.do(getPreviousButton(listInteractor).click()).then(() => {
      return hasLoadingIndicator
        ? this.waitLoadingComplete(listInteractor)
        : waitFirstRowChanged(listInteractor);
    });
  },

  navigateToLastPage(listInteractor, { hasLoadingIndicator = true } = {}) {
    const clickNextUntilDisabled = () => {
      return cy
        .then(() => listInteractor.perform((el) => {
          const nextButton = el.querySelector('[data-test-next-paging-button]');
          return nextButton.disabled;
        }))
        .then((isDisabled) => {
          if (isDisabled) return null;

          return this.clickNextPage(listInteractor, { hasLoadingIndicator }).then(() => clickNextUntilDisabled());
        });
    };

    cy.expect(getNextButton(listInteractor).has({ disabled: false }));
    return clickNextUntilDisabled();
  },

  navigateToFirstPage(listInteractor, { hasLoadingIndicator = true } = {}) {
    const clickPreviousUntilDisabled = () => {
      return cy
        .then(() => listInteractor.perform((el) => {
          const prevButton = el.querySelector('[data-test-prev-paging-button]');
          return prevButton.disabled;
        }))
        .then((isDisabled) => {
          if (isDisabled) return null;

          return this.clickPreviousPage(listInteractor, { hasLoadingIndicator }).then(() => clickPreviousUntilDisabled());
        });
    };

    cy.expect(getPreviousButton(listInteractor).has({ disabled: false }));
    return clickPreviousUntilDisabled();
  },

  assertPagingText(listInteractor, expectedText) {
    cy.expect(listInteractor.has({ pagingText: expectedText.replaceAll(' ', ' ') }));
  },
};

export default api;
