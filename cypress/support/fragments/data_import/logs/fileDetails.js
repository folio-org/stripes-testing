import { HTML, including } from '@interactors/html';
import {
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  Link,
  PaneHeader
} from '../../../../../interactors';
import LogsViewAll from './logsViewAll';

const invoiceNumberFromEdifactFile = '94999';

const resultsList = MultiColumnList({ id:'search-results-list' });
const jobSummaryTable = MultiColumnList({ id: 'job-summary-table' });

const columnNameInResultList = {
  srsMarc: resultsList.find(MultiColumnListHeader({ id:'list-column-srsmarcstatus' })),
  instance: resultsList.find(MultiColumnListHeader({ id:'list-column-instancestatus' })),
  holdings: resultsList.find(MultiColumnListHeader({ id:'list-column-holdingsstatus' })),
  item: resultsList.find(MultiColumnListHeader({ id:'list-column-itemstatus' })),
  authority: resultsList.find(MultiColumnListHeader({ id:'list-column-authoritystatus' })),
  order: resultsList.find(MultiColumnListHeader({ id:'list-column-orderstatus' })),
  invoice: resultsList.find(MultiColumnListHeader({ id:'list-column-invoicestatus' })),
  error: resultsList.find(MultiColumnListHeader({ id:'list-column-error' })),
  title: resultsList.find(MultiColumnListHeader({ id:'list-column-title' }))
};

const columnNameInSummuryTable = {
  authority: jobSummaryTable.find(MultiColumnListHeader({ id:'job-summary-table-list-column-authority' })),
  order: jobSummaryTable.find(MultiColumnListHeader({ id:'job-summary-table-list-column-order' })),
  invoice: jobSummaryTable.find(MultiColumnListHeader({ id:'job-summary-table-list-column-invoice' })),
  error: jobSummaryTable.find(MultiColumnListHeader({ id:'job-summary-table-list-column-invoice' }))
};

const status = {
  created: 'Created',
  updated: 'Updated',
  noAction: 'No action',
  dash: 'No value set-',
  blank: 'No value set',
  error: 'Error'
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

const checkAuthorityQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 5, content: quantity }))
    .exists());
};

const checkInvoiceInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 7, content: quantity }))
    .exists());
};

const checkOrderQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 6, content: quantity }))
    .exists());
};

const checkErrorQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(jobSummaryTable
    .find(MultiColumnListRow({ indexRow: `row-${row}` }))
    .find(MultiColumnListCell({ columnIndex: 8, content: quantity }))
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

const checkColumnsInSummaryTable = (value, specialColumnName) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(jobSummaryTable
      .find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: value })));
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

function getMultiColumnListCellsValues() {
  const cells = [];
  // get MultiColumnList rows and loop over
  return cy.get('[data-row-index]').each($row => {
    // from each row, choose specific cell
    cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
    // extract its text content
      .invoke('text')
      .then(cellValue => {
        cells.push(cellValue);
      });
  })
    .then(() => cells);
}

function validateNumsAscendingOrder(prev) {
  const itemsClone = [...prev];
  itemsClone.sort((a, b) => a - b);
  cy.expect(itemsClone).to.deep.equal(prev);
}

export default {
  columnNameInResultList,
  columnNameInSummuryTable,
  status,
  invoiceNumberFromEdifactFile,
  validateNumsAscendingOrder,
  getMultiColumnListCellsValues,
  checkStatusInColumn,
  checkItemsStatusesInResultList,
  checkItemsQuantityInSummaryTable,
  checkOrderQuantityInSummaryTable,
  checkInvoiceInSummaryTable,
  checkSrsRecordQuantityInSummaryTable,
  checkInstanceQuantityInSummaryTable,
  checkHoldingsQuantityInSummaryTable,
  checkItemQuantityInSummaryTable,
  checkAuthorityQuantityInSummaryTable,
  checkErrorQuantityInSummaryTable,
  checkColumnsInSummaryTable,

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

  openItemInInventory:(itemStatus, rowNumber = 0) => {
    cy.do(resultsList.find(MultiColumnListCell({ row: rowNumber, columnIndex: 5 }))
      .find(Link(itemStatus))
      .click());
  },

  openOrder:(itemStatus, rowNumber = 0) => {
    cy.do(resultsList.find(MultiColumnListCell({ row: rowNumber, columnIndex: 7 }))
      .find(Link(itemStatus))
      .click());
  },

  openItemInInventoryByTitle:(title, itemStatus = 'Updated') => {
    cy.do(MultiColumnListCell({ content: title }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(resultsList.find(MultiColumnListCell({ row: Number(rowNumber.slice(4)), columnIndex: 5 }))
          .find(Link(itemStatus))
          .click());
      }
    ));
  },

  filterRecordsWithError:(quantity) => {
    cy.do(jobSummaryTable
      .find(MultiColumnListRow({ indexRow: 'row-3' }))
      .find(MultiColumnListCell({ columnIndex: 7, content: quantity }))
      .find(Link({ href: including('/data-import/job-summary') }))
      .click());
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
  },

  verifyErrorMessage:(expectedError, rowNumber = 0) => {
    return LogsViewAll.getSingleJobProfile() // get the first job id from job logs list
      .then(({ id }) => {
      // then, make request with the job id
      // and get the only record id inside the uploaded file
        const queryString = 'limit=1000&order=asc';
        return cy.request({
          method: 'GET',
          url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobLogEntries/${id}?${queryString}`,
          headers: {
            'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
            'x-okapi-token': Cypress.env('token'),
          },
        })
          .then(({ body: { entries } }) => {
            cy.expect(entries[rowNumber].error).to.eql(expectedError);
          });
      });
  },

  verifyTitle:(title, specialColumnName, rowIndex = 0) => {
    cy.then(() => specialColumnName.index())
      .then((index) => cy.expect(resultsList.find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ columnIndex: index }))
        .has({ content: title })));
  },

  verifyQuantityOfRecordsWithError:(number) => {
    cy.expect(PaneHeader({ id:'paneHeaderpane-results' }).find(HTML(including(`${number} records found`))).exists());
  },

  verifyLogSummaryTableIsHidden:() => {
    cy.expect(jobSummaryTable.absent());
  },

  // this.getMultiColumnListCellsValues(this.visibleColumns.ENDED_RUNNING.columnIndex).then(cells => {
  //   // convert each cell value to Date object
  //   const dates = cells.map(cell => new Date(cell));

  //   // create new array from the dates and sort this array in descending order
  //   const sortedDates = [...dates].sort((a, b) => b - a);

  //   // if job logs are sorted by default in reverse chronological order
  //   // the dates and sortedDates should be equal
  //   expect(dates).to.deep.equal(sortedDates);
  // });

  verifyRecordsSortingOrder() {
    getMultiColumnListCellsValues(1).then(cells => {
      const dates = cells.map(cell => new Date(cell));
      validateNumsAscendingOrder(dates);
    });
  },

  verifyStatusHasLinkToOrder:(rowNumber) => {
    cy.expect(resultsList
      .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
      .find(MultiColumnListCell({ columnIndex: 7 }))
      .find(Link({ href: including('/orders/lines/view') }))
      .exists());
  }
};
