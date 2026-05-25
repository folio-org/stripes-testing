import { recurse } from 'cypress-recurse';
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

const areColumnValuesSorted = (
  values,
  direction,
  getSortableValue = defaultGetSortableValue,
  comparator = defaultComparator,
) => {
  const sortableValues = values.map(getSortableValue);
  const expectedValues = getSortedValues(sortableValues, direction, comparator);

  return Cypress._.isEqual(sortableValues, expectedValues);
};

const scrollHeaderIntoView = (listInteractor, column) => {
  cy.do(listInteractor.scrollHeaderIntoView(column));
};

const getPaginationButton = (listInteractor, label) => listInteractor.find(Button(label));

const getNextButton = (listInteractor) => getPaginationButton(listInteractor, COMMON_BUTTON_LABELS.NEXT);

const getPreviousButton = (listInteractor) => getPaginationButton(listInteractor, COMMON_BUTTON_LABELS.PREVIOUS);

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
 * @property {(listInteractor: ListInteractor) => void} waitLoadingComplete
 * @property {(listInteractor: ListInteractor, rowCount: number) => void} assertRowCount
 * @property {(listInteractor: ListInteractor, columns: string[]) => void} assertColumns
 * @property {(listInteractor: ListInteractor, column: string) => void} sortListBy
 * @property {(column: string, sortDirection?: string) => void} assertColumnSortDirection
 * @property {(listInteractor: ListInteractor, column: string, isSortable?: boolean) => void} assertColumnSortable
 * @property {(listInteractor: ListInteractor, column: string, options?: {normalizeValue?: Function}) => Cypress.Chainable<string[]>} getColumnValues
 * @property {(listInteractor: ListInteractor, column: string, options?: {direction?: string, normalizeValue?: Function, getSortableValue?: Function, comparator?: Function, waitForUpdate?: boolean, timeout?: number, delay?: number}) => Cypress.Chainable<void>} assertColumnValuesSorted
 * @property {(listInteractor: ListInteractor, column: string, options?: {normalizeValue?: Function, getSortableValue?: Function, comparator?: Function}) => Cypress.Chainable<void>} assertColumnValuesNotSorted
 * @property {(listInteractor: ListInteractor, rowsConfig?: RowsConfig) => void} assertRowsCellsContent
 * @property {(listInteractor: ListInteractor, isEnabled: boolean) => void} assertNextPageButtonEnabled
 * @property {(listInteractor: ListInteractor, isEnabled: boolean) => void} assertPreviousPageButtonEnabled
 * @property {(listInteractor: ListInteractor) => void} clickNextPage
 * @property {(listInteractor: ListInteractor) => void} clickPreviousPage
 * @property {(listInteractor: ListInteractor) => void} navigateToLastPage
 * @property {(listInteractor: ListInteractor) => void} navigateToFirstPage
 */

/** @type {MultiColumnListApi} */
const api = {
  /**
   * Waits until list loading indicator is disabled.
   *
   * @param {ListInteractor} listInteractor - Target multi-column list interactor.
   * @returns {void}
   *
   * @example
   * import { MultiColumnList } from '../../../interactors';
   *
   * const transactionsList = MultiColumnList({ id: 'transactions-list' });
   * api.waitLoadingComplete(transactionsList);
   */
  waitLoadingComplete(listInteractor) {
    cy.expect(listInteractor.has({ loading: false }));
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
      waitForUpdate = true,
      timeout = 5000,
      delay = 300,
    } = options;

    const readValues = () => this.getColumnValues(listInteractor, column, { normalizeValue });

    if (!waitForUpdate) {
      return readValues().then((values) => {
        expect(areColumnValuesSorted(values, direction, getSortableValue, comparator)).to.equal(
          true,
        );
      });
    }

    return recurse(
      () => readValues(),
      (values) => areColumnValuesSorted(values, direction, getSortableValue, comparator),
      {
        timeout,
        delay,
        log: `Waiting for "${column}" to be sorted ${direction}`,
      },
    );
  },

  assertColumnValuesNotSorted(listInteractor, column, options = {}) {
    const {
      normalizeValue = defaultNormalizeValue,
      getSortableValue = defaultGetSortableValue,
      comparator = defaultComparator,
    } = options;

    return this.getColumnValues(listInteractor, column, { normalizeValue }).then((values) => {
      const sortableValues = values.map(getSortableValue);
      const sortedAscendingValues = getSortedValues(
        sortableValues,
        SORT_DIRECTIONS.ASCENDING,
        comparator,
      );
      const sortedDescendingValues = getSortedValues(
        sortableValues,
        SORT_DIRECTIONS.DESCENDING,
        comparator,
      );

      expect(sortableValues).to.not.deep.equal(sortedAscendingValues);
      expect(sortableValues).to.not.deep.equal(sortedDescendingValues);
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

  clickNextPage(listInteractor) {
    cy.do(getNextButton(listInteractor).click());
    this.waitLoadingComplete(listInteractor);
  },

  clickPreviousPage(listInteractor) {
    cy.do(getPreviousButton(listInteractor).click());
    this.waitLoadingComplete(listInteractor);
  },

  navigateToLastPage(listInteractor) {
    const clickNextUntilDisabled = () => {
      return cy
        .then(() => listInteractor.perform((el) => {
          const nextButton = el.querySelector('[data-test-next-paging-button]');
          return nextButton.disabled;
        }))
        .then((isDisabled) => {
          if (isDisabled) return null;
          this.clickNextPage(listInteractor);
          return clickNextUntilDisabled();
        });
    };

    clickNextUntilDisabled();
  },

  navigateToFirstPage(listInteractor) {
    const clickPreviousUntilDisabled = () => {
      cy.then(() => listInteractor.perform((el) => {
        const prevButton = el.querySelector('[data-test-prev-paging-button]');
        return prevButton.disabled;
      })).then((isDisabled) => {
        if (isDisabled) return null;
        this.clickPreviousPage(listInteractor);
        return clickPreviousUntilDisabled();
      });
    };

    clickPreviousUntilDisabled();
  },
};

export default api;
