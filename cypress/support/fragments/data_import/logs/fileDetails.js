import {
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  Link
} from '../../../../../interactors';

const resultsList = MultiColumnList({ id:'search-results-list' });

const columnName = {
  srsMarc: resultsList.find(MultiColumnListHeader({ id:'list-column-srsmarcstatus' })),
  instance: resultsList.find(MultiColumnListHeader({ id:'list-column-instancestatus' })),
  holdings: resultsList.find(MultiColumnListHeader({ id:'list-column-holdingsstatus' })),
  item: resultsList.find(MultiColumnListHeader({ id:'list-column-itemstatus' })),
  invoice: resultsList.find(MultiColumnListHeader({ id:'list-column-invoicestatus' }))
};

const status = {
  created: 'Created',
  updated: 'Updated',
  discarded: 'Discarded',
  dash: 'No value set-'
};

const checkStatusInColumn = (specialStatus, specialColumnName) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(resultsList.find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: specialStatus })));
};

function checkItemsStatusesInResultList(rowIndex, itemStatuses) {
  // itemStatuses = [SRS MARC status, Instance status, Holdings status, Item status]
  const indexes = [2, 3, 4, 5];
  itemStatuses.forEach((itemStatus, columnIndex) => {
    cy.expect(MultiColumnList({ id: 'search-results-list' })
      .find(MultiColumnListRow({ index: rowIndex }))
      .find(MultiColumnListCell({ columnIndex: indexes[columnIndex], content: itemStatus }))
      .exists());
  });
}

const checkItemsQuantityInSummaryTable = (quantity, specialColumnName) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(MultiColumnList({ id: 'job-summary-table' }).find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: quantity })));
};

const invoiceNumberFromEdifactFile = '94999';

export default {
  columnName,
  status,
  invoiceNumberFromEdifactFile,
  checkStatusInColumn,
  checkItemsStatusesInResultList,
  checkItemsQuantityInSummaryTable,

  openInstanceInInventory:(columnIndex = 3, row = 0) => {
    cy.do(MultiColumnList({ id:'search-results-list' })
      .find(MultiColumnListCell({ row, columnIndex }))
      .find(Link('Updated'))
      .click());
  }
};
