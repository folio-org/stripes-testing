import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Selection,
  SelectionList,
} from '../../../../../interactors';
import FileDetails from './fileDetails';

const anyProfileAccordion = Accordion({ id: 'profileIdAny' });
const runningAccordion = Accordion('Running');
const actionsButton = Button('Actions');
const viewAllLogsButton = Button('View all logs');
const selectAllCheckbox = Checkbox({ name: 'selected-all' });
const searchResultList = MultiColumnList({ id: 'search-results-list' });
const deleteSelectedLogsButton = Button('Delete selected logs');
const times = Button({ icon: 'times' });
const visitedLinkColor = 'rgb(47, 96, 159)';

// Column headers of the logs list on the Data Import landing page, in the order they are sorted in the test cases
export const LOGS_LIST_COLUMNS = {
  FILE_NAME: 'File name',
  STATUS: 'Status',
  RECORDS: 'Records',
  JOB_PROFILE: 'Job profile',
  STARTED_RUNNING: 'Started running',
  ENDED_RUNNING: 'Ended running',
  RUN_BY: 'Run by',
  ID: 'ID',
};

// How the landing page sorts every column: by the text (case-insensitive, by character code),
// by the number or by the date
const logsListColumnTypes = {
  [LOGS_LIST_COLUMNS.FILE_NAME]: 'string',
  [LOGS_LIST_COLUMNS.STATUS]: 'string',
  [LOGS_LIST_COLUMNS.RECORDS]: 'number',
  [LOGS_LIST_COLUMNS.JOB_PROFILE]: 'string',
  [LOGS_LIST_COLUMNS.STARTED_RUNNING]: 'date',
  [LOGS_LIST_COLUMNS.ENDED_RUNNING]: 'date',
  [LOGS_LIST_COLUMNS.RUN_BY]: 'string',
  [LOGS_LIST_COLUMNS.ID]: 'number',
};

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

const actionsButtonClick = () => cy.do(actionsButton.click());
const viewAllLogsButtonClick = () => cy.do(viewAllLogsButton.click());
const selectAllLogs = () => cy.do(MultiColumnList({ id: 'job-logs-list' }).find(selectAllCheckbox).click());
const deleteLogsButtonClick = () => cy.do(deleteSelectedLogsButton.click());

export default {
  quantityRecordsInInvoice,
  actionsButtonClick,
  viewAllLogsButtonClick,
  selectAllLogs,
  deleteLogsButtonClick,

  clickOnLogsListColumnHeader: (columnName) => {
    // The last columns ("Run by", "ID") are out of sight until the list is scrolled to them
    cy.do(MultiColumnList({ id: 'job-logs-list' }).scrollHeaderIntoView(columnName));
    cy.do(MultiColumnList({ id: 'job-logs-list' }).find(MultiColumnListHeader(columnName)).click());
  },

  verifyLogsListIsSortedByColumn: (columnName, { descending = false } = {}) => {
    const logsList = MultiColumnList({ id: 'job-logs-list' });
    const columnType = logsListColumnTypes[columnName];
    let values;

    // Waits until the sort is applied to the column
    cy.do(logsList.scrollHeaderIntoView(columnName));
    cy.expect(
      logsList
        .find(
          MultiColumnListHeader({
            content: columnName,
            sort: descending ? 'descending' : 'ascending',
          }),
        )
        .exists(),
    );
    // The list refreshes by itself (other imports), so all its rows are read at once
    cy.do(
      logsList.perform((list) => {
        const columnIndex = [...list.querySelectorAll('[role="columnheader"]')].findIndex(
          (header) => header.textContent.trim() === columnName,
        );

        values = [...list.querySelectorAll('[data-row-index]')]
          .map((row) =>
            row.querySelectorAll('[class*="mclCell-"]')[columnIndex]?.textContent.trim(),
          )
          .filter(Boolean)
          .map((value) => {
            if (columnType === 'number') return parseFloat(value.replace(/,/g, ''));
            if (columnType === 'date') return new Date(value).getTime();
            return value.toUpperCase();
          });
      }),
    );
    cy.then(() => {
      const expectedValues = [...values].sort((a, b) => {
        if (columnType === 'string') return a < b ? -1 : Number(a > b);
        return a - b;
      });

      if (descending) expectedValues.reverse();

      expect(values.length, `rows with a value in "${columnName}"`).to.be.greaterThan(1);
      expect(values, `"${columnName}" values`).to.deep.eq(expectedValues);
    });
  },

  openViewAllLogs: () => {
    cy.wait(1500);
    actionsButtonClick();
    viewAllLogsButtonClick();
  },

  checkImportFile(jobProfileName) {
    cy.do(actionsButton.click());
    cy.do(viewAllLogsButton.click());
    cy.do([
      anyProfileAccordion.clickHeader(),
      anyProfileAccordion.find(Selection({ value: including('Choose job profile') })).open(),
    ]);
    cy.do(SelectionList().select(jobProfileName));
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile: (status = 'Completed', rowNumber = 0) => cy.do(MultiColumnListCell({ row: rowNumber, content: status }).exists()),

  checkJobStatus: (fileName, status) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');

    cy.do(
      MultiColumnListCell({ content: including(newFileName) }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: status }))
            .exists(),
        );
      }),
    );
  },
  checkJobStatusByUser: (fileName, username, status) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');
    cy.do(
      MultiColumnListCell({ content: username }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: including(newFileName) }))
            .exists(),
        );
        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: status }))
            .exists(),
        );
      }),
    );
  },
  openFileDetailsByRowNumber: (rowNumber = 0) => {
    cy.do(
      MultiColumnList({ id: 'list-data-import' })
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .find(Link({ href: including('/data-import/job-summary') }))
        .click(),
    );
  },
  // A job's status turns final before its record log entries are written, and the log details page
  // loads them only once - opened too early, it shows an empty record list. Call before openFileDetails.
  // Read-only and never fails: gives up quietly if the job is not found (e.g. other tenant) or has no entries.
  waitForJobLogEntriesViaApi: (fileName, { timeout = 30_000, delay = 2_000 } = {}) => {
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const getQuietly = (path, searchParams) =>
      cy
        .okapiRequest({
          path,
          searchParams,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        })
        .then(({ status, body }) => (status === 200 ? body : null));
    const waitForEntries = (jobId, timeLeft) => {
      getQuietly(`metadata-provider/jobLogEntries/${jobId}`, { limit: 1 }).then((log) => {
        if (log?.entries?.length) return;
        if (timeLeft <= 0) {
          cy.log(`No job log entries for ${fileName} after ${timeout} ms`);
          return;
        }
        cy.wait(delay);
        waitForEntries(jobId, timeLeft - delay);
      });
    };

    getQuietly('metadata-provider/jobExecutions', {
      fileName: `*${baseName}*`,
      sortBy: 'completed_date,desc',
      limit: 10,
    }).then((body) => {
      // the newest finished job of this file; a split file's parent has no entries of its own
      const job = (body?.jobExecutions || []).find(
        ({ status, subordinationType }) =>
          ['COMMITTED', 'ERROR'].includes(status) && subordinationType !== 'COMPOSITE_PARENT',
      );
      if (job) waitForEntries(job.id, timeout);
    });
  },
  openFileDetails: (fileName) => {
    const newFileName = fileName.replace('.mrc', '');

    cy.do(Link(including(newFileName)).click());
    FileDetails.verifyLogDetailsPageIsOpened(newFileName);
    FileDetails.verifyResultsListIsVisible();
    // TODO need to wait until page is uploaded
    cy.wait(3500);
  },

  checkQuantityRecordsInFile: (quantityRecords) => cy.do(MultiColumnListCell({ row: 0, content: quantityRecords }).exists()),

  clickOnHotLink: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(
      searchResultList.find(MultiColumnListCell({ row, columnIndex })).find(Link(status)).click(),
    );
  },

  verifyInstanceStatus: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(
      searchResultList.find(MultiColumnListCell({ row, columnIndex, content: status })).exists(),
    );
  },

  goToTitleLink: (title) => {
    cy.do(
      searchResultList.find(Link(title)).perform((element) => {
        // Remove target="_blank" attribute so it doesn't open in new tab
        if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
          element.removeAttribute('target');
        }
        element.click();
      }),
    );
  },

  checkAuthorityLogJSON: (propertiesArray) => {
    cy.do(Button('Authority').click());
    cy.wait(1500);
    propertiesArray.forEach((property) => {
      cy.expect(HTML(property).exists());
    });
  },

  getCreatedItemsID: (rowIndex = 0) => cy.then(() => searchResultList
    .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
    .find(Link('Created'))
    .href()),

  getCreatedItemID(rowIndex = 0) {
    return cy.then(() => {
      searchResultList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(Link('Created'))
        .href()
        .then((link) => {
          return cy.wrap(
            link.substring(link.indexOf('/inventory/view/') + '/inventory/view/'.length),
          );
        });
    });
  },

  checkFileIsRunning: (fileName) => {
    cy.wait(1500);
    cy.expect(runningAccordion.find(HTML(including(fileName))).exists());
  },
  verifyCheckboxForMarkingLogsAbsent: () => cy.expect(MultiColumnList({ id: 'job-logs-list' }).find(selectAllCheckbox).absent()),
  verifyDeleteSelectedLogsButtonAbsent: () => cy.expect(deleteSelectedLogsButton.absent()),
  closePane: () => {
    cy.do(times.click());
  },

  verifyFirstFileNameStyle: () => {
    cy.get('#job-logs-list [class*="mclCell-"]:nth-child(1) a')
      .eq(0)
      .should('have.css', 'text-decoration')
      .and('include', 'underline');
  },

  verifyNoFileNameLogAbsent: () => {
    cy.do(
      MultiColumnList({ id: 'job-logs-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: 'No file name' }))
        .absent(),
    );
  },

  verifyFirstFileNameInLogList: (username, fileName) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');
    cy.do(
      MultiColumnListCell({ content: username }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: including(newFileName) }))
            .exists(),
        );
      }),
    );
  },

  clickFirstFileNameCell: () => {
    cy.do(
      MultiColumnList({ id: 'job-logs-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
        .hrefClick(),
    );
  },

  verifyVisitedLinkColor: () => {
    cy.get('#job-logs-list [class*="mclCell-"]:nth-child(1) a')
      .eq(0)
      .should('have.css', 'color', visitedLinkColor);
  },

  waitFileIsImported: (fileName) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');

    cy.expect(
      MultiColumnList({ id: 'job-logs-list' })
        .find(Button(including(newFileName)))
        .exists(),
    );
  },

  openJobProfile: (jobProfileName) => {
    cy.do(MultiColumnList({ id: 'job-logs-list' }).find(Link(jobProfileName)).click());
  },

  getCreatedItemsTitle: (rowIndex = 0) => cy.then(() => searchResultList
    .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
    .find(Link({ href: including('/data-import/log/') }))
    .text()),
};
