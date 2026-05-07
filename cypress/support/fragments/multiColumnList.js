import {
  Button,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
} from '../../../interactors';
import { COMMON_BUTTON_LABELS, SORT_DIRECTIONS } from '../constants';

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
 * @property {(column: string, sortDirection?: string) => void} assertColumnSortDirection
 * @property {(listInteractor: ListInteractor, rowsConfig?: RowsConfig) => void} assertRowsCellsContent
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
  assertColumnSortDirection(column, sortDirection = SORT_DIRECTIONS.DESCENDING) {
    cy.expect(MultiColumnListHeader(column).has({ sort: sortDirection }));
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
        cy.expect([
          targetRow.find(MultiColumnListCell(cellConfig))[exists ? 'exists' : 'absent'](),
        ]);
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

    cy.expect([
      listInteractor.find(Button(COMMON_BUTTON_LABELS.PREVIOUS)).has({ disabled: previous }),
      listInteractor.find(Button(COMMON_BUTTON_LABELS.NEXT)).has({ disabled: next }),
    ]);
  },
};

export default api;
