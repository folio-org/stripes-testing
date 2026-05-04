import {
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
} from '../../../interactors';
import { SORT_DIRECTIONS } from '../constants';

const api = {
  waitLoadingComplete(listInteractor) {
    cy.expect(listInteractor.has({ loading: false }));
  },

  assertColumnSortDirection(column, sortDirection = SORT_DIRECTIONS.DESCENDING) {
    cy.expect(MultiColumnListHeader(column).has({ sort: sortDirection }));
  },

  assertRowsCellsContent(listInteractor, rowsConfig = []) {
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
};

export default api;
