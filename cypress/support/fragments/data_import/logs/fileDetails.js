import {
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  Link
} from '../../../../../interactors';

const resultsList = MultiColumnList({ id:'search-results-list' });
const jobSummaryTable = MultiColumnList({ id: 'job-summary-table' });
const listRow = MultiColumnListRow({ indexRow: 'row-0' });

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

const checkItemsQuantityInSummaryTable = (rowNumber, quantity) => {
  for (let i = 1; i < 5; i++) {
    cy.expect(jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
      .find(MultiColumnListCell({ columnIndex: i, content: quantity }))
      .exists());
  }
};

const checkCreatedInvoiceISummaryTable = (quantity) => {
  cy.expect(jobSummaryTable
    .find(listRow)
    .find(MultiColumnListCell({ columnIndex: 1, content: quantity }))
    .exists());
  cy.expect(jobSummaryTable
    .find(listRow)
    .find(MultiColumnListCell({ columnIndex: 7, content: quantity }))
    .exists());
};

function checkItemsStatusesInResultList(rowIndex, itemStatuses) {
  // itemStatuses = [SRS MARC status, Instance status, Holdings status, Item status]
  const indexes = [2, 3, 4, 5];
  itemStatuses.forEach((itemStatus, columnIndex) => {
    cy.expect(resultsList
      .find(MultiColumnListRow({ index: rowIndex }))
      .find(MultiColumnListCell({ columnIndex: indexes[columnIndex], content: itemStatus }))
      .exists());
  });
}

const invoiceNumberFromEdifactFile = '94999';

export default {
  columnName,
  status,
  invoiceNumberFromEdifactFile,
  checkStatusInColumn,
  checkItemsStatusesInResultList,
  checkItemsQuantityInSummaryTable,
  checkCreatedInvoiceISummaryTable,

  openInstanceInInventory:(columnIndex = 3, row = 0) => {
    cy.do(resultsList.find(MultiColumnListCell({ row, columnIndex }))
      .find(Link('Updated'))
      .click());
  }
};
