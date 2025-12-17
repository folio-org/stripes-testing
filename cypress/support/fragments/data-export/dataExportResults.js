import { including } from '@interactors/html';
import {
  HTML,
  ListRow,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiColumnList,
  matching,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const getSearchResult = (row = 0, col = 0) => MultiColumnListCell({ row, columnIndex: col });
const quickExportFileNameMask = /quick-export-\d{1,3}.mrc/gm;

export default {
  defaultJobProfile: 'Default instances export job profile',
  getSearchResult,
  verifyQuickExportResult() {
    cy.do([
      this.getSearchResult(0, 0).perform((element) => {
        expect(element.innerText).to.match(quickExportFileNameMask);
      }),
      MultiColumnListCell({ row: 0, content: this.defaultJobProfile }).exists(),
    ]);
  },

  verifyTableWithResultsExists() {
    cy.expect(MultiColumnList({ id: 'job-logs-list' }).exists());
  },

  verifySuccessExportResultCells(
    resultFileName,
    recordsCount,
    jobId,
    userName = null,
    jobType = 'Default instances',
  ) {
    const row = ListRow({ content: including(resultFileName) });
    const resultRow = {
      fileName: row.find(MultiColumnListCell({ columnIndex: 0 })),
      status: row.find(MultiColumnListCell({ columnIndex: 1 })),
      total: row.find(MultiColumnListCell({ columnIndex: 2 })),
      exported: row.find(MultiColumnListCell({ columnIndex: 3 })),
      failed: row.find(MultiColumnListCell({ columnIndex: 4 })),
      jobProfile: row.find(MultiColumnListCell({ columnIndex: 5 })),
      endedRunning: row.find(MultiColumnListCell({ columnIndex: 7 })),
      runBy: row.find(MultiColumnListCell({ columnIndex: 8 })),
      id: row.find(MultiColumnListCell({ columnIndex: 9 })),
    };
    cy.getAdminToken().then(() => {
      cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(
        () => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${
            Cypress.env('users')[0].personal.lastName
          }`.trim();
          cy.expect([
            resultRow.status.is({ content: 'Completed' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: recordsCount.toString() }),
            resultRow.failed.is({ content: '' }),
            resultRow.jobProfile.is({ content: `${jobType} export job profile` }),
            resultRow.runBy.is({ content: userNameToVerify }),
            resultRow.id.is({ content: jobId.toString() }),
          ]);
        },
      );
    });

    // verify file name
    cy.do(
      resultRow.fileName.perform((element) => {
        expect(element.innerText).to.equal(resultFileName);
        expect(element.innerText).to.include(`-${jobId}.mrc`);
      }),
    );
    cy.expect(resultRow.fileName.find(HTML({ className: including('button') })).exists());

    // verify date (ended running)
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    cy.do(
      resultRow.endedRunning.perform((element) => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }),
    );
  },

  verifyFailedExportResultCells(
    resultFileName,
    recordsCount,
    jobId,
    userName = null,
    jobType = 'Default instances',
    invalidQuery = false,
  ) {
    const row = ListRow({ content: including(resultFileName) });
    const resultRow = {
      fileName: row.find(MultiColumnListCell({ columnIndex: 0 })),
      status: row.find(MultiColumnListCell({ columnIndex: 1 })),
      total: row.find(MultiColumnListCell({ columnIndex: 2 })),
      exported: row.find(MultiColumnListCell({ columnIndex: 3 })),
      failed: row.find(MultiColumnListCell({ columnIndex: 4 })),
      jobProfile: row.find(MultiColumnListCell({ columnIndex: 5 })),
      endedRunning: row.find(MultiColumnListCell({ columnIndex: 7 })),
      runBy: row.find(MultiColumnListCell({ columnIndex: 8 })),
      id: row.find(MultiColumnListCell({ columnIndex: 9 })),
    };
    cy.getAdminToken().then(() => {
      cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(
        () => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${
            Cypress.env('users')[0].personal.lastName
          }`;
          cy.expect([
            resultRow.status.is({ content: 'Fail' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: '0' }),
            resultRow.jobProfile.is({ content: `${jobType} export job profile` }),
            resultRow.runBy.is({ content: userNameToVerify }),
            resultRow.id.is({ content: jobId.toString() }),
          ]);

          if (invalidQuery) cy.expect(resultRow.failed.is({ content: '' }));
          else cy.expect(resultRow.failed.is({ content: recordsCount.toString() }));
        },
      );
    });

    // verify file name
    cy.do(
      resultRow.fileName.perform((element) => {
        expect(element.innerText).to.equal(resultFileName);
        expect(element.innerText).to.include(`-${jobId}.mrc`);
      }),
    );

    // verify date (ended running)
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    cy.do(
      resultRow.endedRunning.perform((element) => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }),
    );
  },

  verifyCompletedWithErrorsExportResultCells(
    resultFileName,
    totalRecordsCount,
    exportedRecordsCount,
    jobId,
    user,
    jobType = 'Default instances',
    invalidQuery = false,
  ) {
    const row = ListRow({ content: including(resultFileName) });
    const resultRow = {
      fileName: row.find(MultiColumnListCell({ columnIndex: 0 })),
      status: row.find(MultiColumnListCell({ columnIndex: 1 })),
      total: row.find(MultiColumnListCell({ columnIndex: 2 })),
      exported: row.find(MultiColumnListCell({ columnIndex: 3 })),
      failed: row.find(MultiColumnListCell({ columnIndex: 4 })),
      jobProfile: row.find(MultiColumnListCell({ columnIndex: 5 })),
      endedRunning: row.find(MultiColumnListCell({ columnIndex: 7 })),
      runBy: row.find(MultiColumnListCell({ columnIndex: 8 })),
      id: row.find(MultiColumnListCell({ columnIndex: 9 })),
    };

    const userNameToVerify = `${user.firstName} ${user.lastName}`;

    cy.expect([
      resultRow.status.is({ content: 'Completed with errors' }),
      resultRow.total.is({ content: totalRecordsCount.toString() }),
      resultRow.exported.is({ content: exportedRecordsCount.toString() }),
      resultRow.jobProfile.is({ content: `${jobType} export job profile` }),
      resultRow.runBy.is({ content: userNameToVerify }),
      resultRow.id.is({ content: jobId.toString() }),
    ]);

    const failedRecordsCount = totalRecordsCount - exportedRecordsCount;

    if (invalidQuery) cy.expect(resultRow.failed.is({ content: '' }));
    else cy.expect(resultRow.failed.is({ content: failedRecordsCount.toString() }));

    // verify file name
    cy.do(
      resultRow.fileName.perform((element) => {
        expect(element.innerText).to.equal(resultFileName);
        expect(element.innerText).to.include(`-${jobId}.mrc`);
      }),
    );

    // verify date (ended running)
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    cy.do(
      resultRow.endedRunning.perform((element) => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }),
    );
  },

  verifyCompletedWithErrorsWithDuplicatesExportResultCells(
    resultFileName,
    totalRecordsCount,
    exportedRecordsCount,
    failedRecordsCount,
    duplicatesCount,
    jobId,
    user,
    jobType = 'Default instances',
  ) {
    const row = ListRow({ content: including(resultFileName) });
    const resultRow = {
      fileName: row.find(MultiColumnListCell({ columnIndex: 0 })),
      status: row.find(MultiColumnListCell({ columnIndex: 1 })),
      total: row.find(MultiColumnListCell({ columnIndex: 2 })),
      exported: row.find(MultiColumnListCell({ columnIndex: 3 })),
      failed: row.find(MultiColumnListCell({ columnIndex: 4 })),
      jobProfile: row.find(MultiColumnListCell({ columnIndex: 5 })),
      endedRunning: row.find(MultiColumnListCell({ columnIndex: 7 })),
      runBy: row.find(MultiColumnListCell({ columnIndex: 8 })),
      id: row.find(MultiColumnListCell({ columnIndex: 9 })),
    };

    const userNameToVerify = `${user.firstName} ${user.lastName}`;
    const expectedFailedContent = failedRecordsCount
      ? `${failedRecordsCount}, ${duplicatesCount} duplicate(s)`
      : `${duplicatesCount} duplicate(s)`;

    cy.expect([
      resultRow.status.is({ content: 'Completed with errors' }),
      resultRow.total.is({ content: totalRecordsCount.toString() }),
      resultRow.exported.is({ content: exportedRecordsCount.toString() }),
      resultRow.failed.is({ content: expectedFailedContent }),
      resultRow.jobProfile.is({ content: `${jobType} export job profile` }),
      resultRow.runBy.is({ content: userNameToVerify }),
      resultRow.id.is({ content: jobId.toString() }),
    ]);

    // verify file name
    cy.do(
      resultRow.fileName.perform((element) => {
        expect(element.innerText).to.equal(resultFileName);
        expect(element.innerText).to.include(`-${jobId}.mrc`);
      }),
    );

    // verify date (ended running)
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    cy.do(
      resultRow.endedRunning.perform((element) => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }),
    );
  },

  verifyLastLog(fileName, status) {
    const result = {
      fileName: MultiColumnListCell({ row: 0, columnIndex: 0 }),
      status: MultiColumnListCell({ row: 0, columnIndex: 1 }),
    };

    cy.expect(result.status.is({ content: status }));

    const regex = new RegExp(`${fileName.slice(0, -4)}-\\d+.mrc`);

    cy.expect(result.fileName.has({ content: matching(regex) }));
  },

  verifyLastItemCount(count) {
    const result = {
      total: MultiColumnListCell({ row: 0, columnIndex: 2 }),
      exported: MultiColumnListCell({ row: 0, columnIndex: 3 }),
    };

    cy.expect([result.total.is({ content: count }), result.exported.is({ content: count })]);
  },

  verifyFileNameIsDisabled(rowNum) {
    const cellLocator = `[data-row-inner="${rowNum}"]>div>span`;

    cy.get(cellLocator).then((element) => {
      expect(element).to.have.class('disabledFileName---OYGpD');
    });
  },

  verifyErrorMessage(rowNum, fileName) {
    const row = MultiColumnListRow({ index: rowNum });
    const regex = new RegExp(`.+ERROR Invalid CQL syntax in ${fileName.slice(0, -4)}\\.\\w{3}`);
    const errorLogLocator = '[data-test-error-log-info="true"]';
    cy.do(row.click());
    cy.get(errorLogLocator)
      .invoke('text')
      .then((text) => {
        const datePart = text.split(' ')[0];
        const date = new Date(datePart);
        DateTools.verifyDate(date.getTime());
      })
      .should('match', regex);
  },
};
