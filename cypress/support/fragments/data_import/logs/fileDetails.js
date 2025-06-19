import { HTML, including } from '@interactors/html';
import {
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListRow,
  Link,
  PaneHeader,
  Section,
  Button,
  Pane,
} from '../../../../../interactors';
import LogsViewAll from './logsViewAll';
import arrays from '../../../utils/arrays';

const invoiceNumberFromEdifactFile = '94999';

const resultsList = MultiColumnList({ id: 'search-results-list' });
const jobSummaryTable = MultiColumnList({ id: 'job-summary-table' });
const nextButton = Button({ id: 'search-results-list-next-paging-button' });
const previousButton = Button({ id: 'search-results-list-prev-paging-button' });
const paneHeader = PaneHeader({ id: 'paneHeaderpane-results' });

const columnNameInResultList = {
  srsMarc: resultsList.find(MultiColumnListHeader({ id: 'list-column-srsmarcstatus' })),
  instance: resultsList.find(MultiColumnListHeader({ id: 'list-column-instancestatus' })),
  holdings: resultsList.find(MultiColumnListHeader({ id: 'list-column-holdingsstatus' })),
  item: resultsList.find(MultiColumnListHeader({ id: 'list-column-itemstatus' })),
  authority: resultsList.find(MultiColumnListHeader({ id: 'list-column-authoritystatus' })),
  order: resultsList.find(MultiColumnListHeader({ id: 'list-column-orderstatus' })),
  invoice: resultsList.find(MultiColumnListHeader({ id: 'list-column-invoicestatus' })),
  error: resultsList.find(MultiColumnListHeader({ id: 'list-column-error' })),
  title: resultsList.find(MultiColumnListHeader({ id: 'list-column-title' })),
};

const columnNameInSummuryTable = {
  authority: jobSummaryTable.find(
    MultiColumnListHeader({ id: 'job-summary-table-list-column-authority' }),
  ),
  order: jobSummaryTable.find(MultiColumnListHeader({ id: 'job-summary-table-list-column-order' })),
  invoice: jobSummaryTable.find(
    MultiColumnListHeader({ id: 'job-summary-table-list-column-invoice' }),
  ),
  error: jobSummaryTable.find(
    MultiColumnListHeader({ id: 'job-summary-table-list-column-invoice' }),
  ),
};

const status = {
  created: 'Created',
  updated: 'Updated',
  noAction: 'No action',
  dash: 'No value set-',
  blank: 'No value set',
  error: 'Error',
};

const visibleColumnsInSummaryTable = {
  SUMMARY: { columnIndex: 0 },
  SRS_MARC: { columnIndex: 1 },
  INSTANCE: { columnIndex: 2 },
  HOLDINGS: { columnIndex: 3 },
  ITEM: { columnIndex: 4 },
  AUTHORITY: { columnIndex: 5 },
  ORDER: { columnIndex: 6 },
  INVOICE: { columnIndex: 7 },
  ERROR: { columnIndex: 8 },
};

const visibleColumnsInResultsList = {
  RECORD: { columnIndex: 1 },
  TITLE: { columnIndex: 2 },
  SRS_MARC: { columnIndex: 3 },
  INSTANCE: { columnIndex: 4 },
  HOLDINGS: { columnIndex: 5 },
  ITEM: { columnIndex: 6 },
  ORDER: { columnIndex: 7 },
  INVOICE: { columnIndex: 8 },
};

const checkSrsRecordQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 1, content: quantity }))
      .exists(),
  );
};

const checkInstanceQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 2, content: quantity }))
      .exists(),
  );
};

const checkHoldingsQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 3, content: quantity }))
      .exists(),
  );
};

const checkItemQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 4, content: quantity }))
      .exists(),
  );
};

const checkAuthorityQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 5, content: quantity }))
      .exists(),
  );
};

const checkInvoiceInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 7, content: quantity }))
      .exists(),
  );
};

const checkOrderQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 6, content: quantity }))
      .exists(),
  );
};

const checkErrorQuantityInSummaryTable = (quantity, row = 0) => {
  cy.expect(
    jobSummaryTable
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(MultiColumnListCell({ columnIndex: 8, content: quantity }))
      .exists(),
  );
};

const checkItemsQuantityInSummaryTable = (rowNumber, quantity) => {
  for (let i = 1; i < 5; i++) {
    cy.expect(
      jobSummaryTable
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .find(MultiColumnListCell({ columnIndex: i, content: quantity }))
        .exists(),
    );
  }
};

const checkStatusInColumn = (specialStatus, specialColumnName, rowIndex = 0) => {
  cy.then(() => specialColumnName.index()).then((index) => cy.expect(
    resultsList
      .find(MultiColumnListRow({ index: rowIndex }))
      .find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: including(specialStatus) }),
  ));
};

function checkItemsStatusesInResultList(rowIndex, itemStatuses) {
  // itemStatuses = [SRS MARC status, Instance status, Holdings status, Item status]
  const indexes = [2, 3, 4, 5];
  itemStatuses.forEach((itemStatus, columnIndex) => {
    cy.expect(
      resultsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(
          MultiColumnListCell({
            columnIndex: indexes[columnIndex],
            content: including(itemStatus),
          }),
        )
        .exists(),
    );
  });
}

function validateNumsAscendingOrder(prev) {
  const itemsClone = [...prev];
  itemsClone.sort((a, b) => a - b);
  cy.expect(itemsClone).to.deep.equal(prev);
}

function getMultiColumnListCellsValuesInResultsList(cell) {
  const cells = [];

  // get MultiColumnList rows and loop over
  return cy
    .get('#search-results-list')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

function getMultiColumnListCellsValuesInSummaryTable(cell) {
  const cells = [];

  // get MultiColumnList rows and loop over
  return cy
    .get('#job-summary-table')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  columnNameInResultList,
  columnNameInSummuryTable,
  status,
  invoiceNumberFromEdifactFile,
  visibleColumnsInSummaryTable,
  validateNumsAscendingOrder,
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

  openInstanceInInventory: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 3 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openInstanceInInventoryByStatus: (itemStatus) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ content: itemStatus, columnIndex: 3 }))
        .perform((element) => {
          const rowNumber = element.parentElement.getAttribute('data-row-inner');

          cy.do(
            resultsList
              .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
              .find(MultiColumnListCell({ columnIndex: 3 }))
              .find(Link(itemStatus))
              .click(),
          );
        }),
    );
  },

  openHoldingsInInventory: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 4 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openItemInInventory: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 5 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openErrorInSummaryTable: (row) => {
    cy.do(
      jobSummaryTable
        .find(MultiColumnListRow({ indexRow: `row-${row}` }))
        .find(MultiColumnListCell({ columnIndex: 8 }))
        .find(Link())
        .click(),
    );
  },

  openOrder: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 7 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openItemInInventoryByTitle: (title, columnIndex, itemStatus = 'Updated') => {
    cy.do(
      MultiColumnListCell({ content: title }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(
          resultsList
            .find(MultiColumnListCell({ row: Number(rowNumber.slice(4)), columnIndex }))
            .find(Link(itemStatus))
            .click(),
        );
      }),
    );
  },

  openInvoiceLine: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 8 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openAuthority: (itemStatus, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 6 }))
        .find(Link(itemStatus))
        .click(),
    );
  },

  openJsonScreen: (title) => {
    cy.get('#search-results-list')
      .find('a')
      .contains(title)
      .first()
      .invoke('removeAttr', 'target')
      .click();
    cy.wait(2000);
  },

  openJsonScreenByStatus: (importStatus, title, columnNumber = 2) => {
    cy.do(
      resultsList
        .find(MultiColumnListCell({ content: importStatus, columnIndex: columnNumber }))
        .perform((element) => {
          const rowNumber = element.parentElement.getAttribute('data-row-inner');

          cy.get('#search-results-list')
            .find(`div[data-row-inner="${rowNumber}"]`)
            .find('a')
            .contains(title)
            .invoke('removeAttr', 'target')
            .click();
        }),
    );
  },

  filterRecordsWithError: (index) => {
    cy.wait(2000);
    cy.do(
      jobSummaryTable
        .find(MultiColumnListRow({ indexRow: 'row-3' }))
        .find(MultiColumnListCell(index))
        .find(Link({ href: including('/data-import/job-summary') }))
        .click(),
    );
    cy.expect(paneHeader.find(HTML(including('errors found'))).exists());
  },

  clickNextPaginationButton() {
    cy.do(nextButton.click());
  },

  clickPreviousPaginationButton: () => {
    cy.do(previousButton.click());
  },

  paginateThroughAllPages(numberOfPages) {
    for (let i = 0; i < numberOfPages; i++) {
      this.clickNextPaginationButton();
    }
    cy.expect(nextButton.has({ disabled: true }));
  },

  close: () => {
    cy.do(paneHeader.find(Button({ icon: 'times' })).click());
  },

  verifyMultipleHoldingsStatus: (expectedArray, expectedQuantity, rowNumber = 0) => {
    cy.do(
      resultsList.find(MultiColumnListRow({ index: rowNumber })).perform((element) => {
        const currentArray = Array.from(
          element.querySelectorAll('[class*="mclCell-"]:nth-child(5) [class*="baselineCell-"]'),
        ).map((el) => el.innerText.replace(/\n/g, ''));

        const resultArray = currentArray[0].match(/Created \([^)]*\)|No action/g);

        expect(expectedQuantity).to.equal(resultArray.length);
        expect(arrays.compareArrays(expectedArray, resultArray)).to.equal(true);
      }),
    );
  },

  verifyMultipleItemsStatus: (expectedQuantity, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ columnIndex: 5 }))
        .perform((element) => {
          const extractedMatches = [];
          // get text contains e.g. 'Created (it00000000123)' and put it to an array
          Array.from(element.querySelectorAll('[class*="baselineCell-"]')).map((el) => extractedMatches.push(el.innerText.match(/(Created \(it\d+\)|No action|-)/g)));
          // get the first element from an array
          const currentArray = extractedMatches[0];

          expect(expectedQuantity).to.equal(currentArray.length);
        }),
    );
  },

  verifyMultipleErrorStatus: (expectedQuantity, rowNumber = 0) => {
    cy.do(
      resultsList
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ columnIndex: 9 }))
        .perform((element) => {
          const extractedMatches = [];

          // get text contains e.g. 'Error' and put it to an array
          Array.from(element.querySelectorAll('[class*="baselineCell-"]')).map((el) => extractedMatches.push(el.innerText.match(/(Error)/g)));
          // get the first element from an array
          const currentArray = extractedMatches[0];

          expect(expectedQuantity).to.equal(currentArray.length);
        }),
    );
  },

  checkStatusByTitle: (title, itemStatus) => {
    cy.do(
      resultsList.find(MultiColumnListCell({ content: title })).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.wait(1000);
        cy.expect(
          resultsList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(MultiColumnListCell({ columnIndex: 5 }))
            .has({ content: itemStatus }),
        );
      }),
    );
  },

  verifyErrorMessage: (expectedError, rowNumber = 0) => {
    return LogsViewAll.getSingleJobProfile() // get the first job id from job logs list
      .then(({ id }) => {
        // then, make request with the job id
        // and get the only record id inside the uploaded file
        const queryString = 'limit=1000&order=asc';
        return cy
          .request({
            method: 'GET',
            url: `${Cypress.env(
              'OKAPI_HOST',
            )}/metadata-provider/jobLogEntries/${id}?${queryString}`,
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

  verifyTitle: (title, specialColumnName, rowIndex = 0) => {
    cy.then(() => specialColumnName.index()).then((index) => cy.expect(
      resultsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ columnIndex: index }))
        .has({ content: title }),
    ));
  },

  verifyRecordsSortingOrder() {
    getMultiColumnListCellsValuesInResultsList(visibleColumnsInResultsList.RECORD.columnIndex).then(
      (cells) => {
        const dates = cells.map((cell) => new Date(cell));
        validateNumsAscendingOrder(dates);
      },
    );
  },

  verifyQuantityOfRecordsWithError: (number) => {
    cy.expect(paneHeader.find(HTML(including(`${number} errors found`))).exists());
  },

  verifyLogSummaryTableIsHidden: () => cy.expect(jobSummaryTable.absent()),
  verifyResultsListIsVisible: () => cy.expect(resultsList.exists()),

  verifyRecordColumnHasStandardSequentialNumberingForRecords() {
    getMultiColumnListCellsValuesInResultsList(visibleColumnsInResultsList.RECORD.columnIndex).then(
      (cells) => {
        validateNumsAscendingOrder(cells);
      },
    );
  },

  verifyStatusHasLinkToOrder: (rowNumber) => {
    cy.expect(
      resultsList
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .find(MultiColumnListCell({ columnIndex: 7 }))
        .find(Link({ href: including('/orders/lines/view') }))
        .exists(),
    );
  },

  verifyTitleHasLinkToJsonFile: (rowNumber) => {
    cy.expect(
      resultsList
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .find(Link({ href: including('/data-import/log') }))
        .exists(),
    );
  },

  verifyEachInvoiceTitleInColunm: () => {
    // TODO redesign with interactors
    cy.get('#search-results-list')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
          .invoke('text')
          .should('not.be.empty');
      });
  },

  verifyEachInvoiceStatusInColunm: (invoiceStatus) => {
    // TODO redesign with interactors
    cy.get('#search-results-list')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(9)', { withinSubject: $row })
          .invoke('text')
          .should('eq', invoiceStatus);
      });
  },

  verifyLogDetailsPageIsOpened: (fileName) => {
    const newFileName = fileName.replace('.mrc', '');

    cy.expect(Pane(including(newFileName)).exists());
  },

  verifyInstanceStatusIsHiperlink: (itmStatus, rowNumber = 0) => {
    cy.expect(
      resultsList
        .find(MultiColumnListCell({ row: rowNumber, columnIndex: 3 }))
        .find(Link(itmStatus))
        .exists(),
    );
  },

  verifyColumnValuesInSummaryTable: (columnIndex, value) => {
    getMultiColumnListCellsValuesInSummaryTable(columnIndex).then((cells) => {
      cy.wrap(cells).should('deep.equal', value);
    });
  },

  getInvoiceNumber: (vendorInvoiceNumber) => {
    cy.do(
      Section()
        .find(MultiColumnListCell(including(vendorInvoiceNumber)))
        .perform((el) => {
          cy.wrap(el.innerText.split('-')[0]).as('invoiceNumber');
        }),
    );
    return cy.get('@invoiceNumber');
  },

  verifyLogSummaryTableIsDisplayed: () => {
    cy.expect(jobSummaryTable.exists());
  },

  getItemHrids: () => {
    return getMultiColumnListCellsValuesInResultsList(
      visibleColumnsInResultsList.ITEM.columnIndex,
    ).then((cells) => {
      let extractedValues;
      cells.forEach((value) => {
        extractedValues = value.match(/it(\d+)/g);
      });
      return extractedValues;
    });
  },

  verifyHeader: (fileName, recordsNumber) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');

    cy.expect([
      paneHeader.find(HTML(including(newFileName))).exists(),
      paneHeader.find(HTML(including(`${recordsNumber} records found`))).exists(),
    ]);
  },
};
