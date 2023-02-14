import {
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  Link
} from '../../../../../interactors';

const invoiceNumberFromEdifactFile = '94999';

const resultsList = MultiColumnList({ id:'search-results-list' });
const jobSummaryTable = MultiColumnList({ id: 'job-summary-table' });

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
  dash: 'No value set-',
  multiple: 'Multiple'
};

const checkSrsRecordQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 1, content: quantity }))
    .exists());
};

const checkInstanceQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 2, content: quantity }))
    .exists());
};

const checkHoldingsQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 3, content: quantity }))
    .exists());
};

const checkItemQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 4, content: quantity }))
    .exists());
};

const checkCreatedInvoiceISummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 7, content: quantity }))
    .exists());
};

const checkItemsQuantityInSummaryTable = (rowNumber, quantity) => {
  for (let i = 1; i < 5; i++) {
    cy.expect(jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
      .find(MultiColumnListCell({ columnIndex: i, content: quantity }))
      .exists());
  }
};

const checkStatusInColumn = (specialStatus, specialColumnName, rowIndex = 0) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(resultsList.find(MultiColumnListRow({ index: rowIndex }))
      .find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: specialStatus })));
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

export default {
  columnName,
  status,
  invoiceNumberFromEdifactFile,
  checkStatusInColumn,
  checkItemsStatusesInResultList,
  checkItemsQuantityInSummaryTable,
  checkCreatedInvoiceISummaryTable,
  checkSrsRecordQuantityInSummaryTable,
  checkInstanceQuantityInSummaryTable,
  checkHoldingsQuantityInSummaryTable,
  checkItemQuantityInSummaryTable,

  openInstanceInInventory:(itemStatus, rowNumber = 0) => {
    cy.do(resultsList.find(MultiColumnListCell({ row: rowNumber, columnIndex: 3 }))
      .find(Link(itemStatus))
      .click());
  },

  openHoldingsInInventory:(itemStatus, rowNumber = 0) => {
    cy.do(resultsList.find(MultiColumnListCell({ row: rowNumber, columnIndex: 4 }))
      .find(Link(itemStatus))
      .click());
  },

  openHoldingsInInventoryByTitle:(title, itemStatus = 'Updated') => {
    cy.do(MultiColumnListCell({ content: title }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.expect(resultsList.find(MultiColumnListCell({ row: rowNumber, columnIndex: 5 }))
          .find(Link(itemStatus))
          .click());
      }
    ));
  },

  checkStatusByTitle:(title, itemStatus) => {
    cy.do(MultiColumnListCell({ content: title }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.expect(MultiColumnListRow({ indexRow: rowNumber })
          .find(MultiColumnListCell({ columnIndex: 5 }))
          .has({ content: itemStatus }));
      }
    ));
  }
};
