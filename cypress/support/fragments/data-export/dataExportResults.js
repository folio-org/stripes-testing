import { MultiColumnListCell, MultiColumnListRow, matching } from '../../../../interactors';
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

  verifySuccessExportResultCells(
    resultFileName,
    recordsCount,
    jobId,
    userName = null,
    jobType = 'instances',
  ) {
    const resultRow = {
      fileName: MultiColumnListCell({ row: 0, columnIndex: 0 }),
      status: MultiColumnListCell({ row: 0, columnIndex: 1 }),
      total: MultiColumnListCell({ row: 0, columnIndex: 2 }),
      exported: MultiColumnListCell({ row: 0, columnIndex: 3 }),
      failed: MultiColumnListCell({ row: 0, columnIndex: 4 }),
      jobProfile: MultiColumnListCell({ row: 0, columnIndex: 5 }),
      endedRunning: MultiColumnListCell({ row: 0, columnIndex: 7 }),
      runBy: MultiColumnListCell({ row: 0, columnIndex: 8 }),
      id: MultiColumnListCell({ row: 0, columnIndex: 9 }),
    };
    cy.getAdminToken().then(() => {
      cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(
        () => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${
            Cypress.env('users')[0].personal.lastName
          }`;
          cy.do([
            resultRow.status.is({ content: 'Completed' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: recordsCount.toString() }),
            resultRow.failed.is({ content: '' }),
            resultRow.jobProfile.is({ content: `Default ${jobType} export job profile` }),
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
    jobType = 'instances',
    invalidQuery = false,
  ) {
    const resultRow = {
      fileName: MultiColumnListCell({ row: 0, columnIndex: 0 }),
      status: MultiColumnListCell({ row: 0, columnIndex: 1 }),
      total: MultiColumnListCell({ row: 0, columnIndex: 2 }),
      exported: MultiColumnListCell({ row: 0, columnIndex: 3 }),
      failed: MultiColumnListCell({ row: 0, columnIndex: 4 }),
      jobProfile: MultiColumnListCell({ row: 0, columnIndex: 5 }),
      endedRunning: MultiColumnListCell({ row: 0, columnIndex: 7 }),
      runBy: MultiColumnListCell({ row: 0, columnIndex: 8 }),
      id: MultiColumnListCell({ row: 0, columnIndex: 9 }),
    };
    cy.getAdminToken().then(() => {
      cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(
        () => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${
            Cypress.env('users')[0].personal.lastName
          }`;
          cy.do([
            resultRow.status.is({ content: 'Fail' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: '0' }),
            resultRow.jobProfile.is({ content: `Default ${jobType} export job profile` }),
            resultRow.runBy.is({ content: userNameToVerify }),
            resultRow.id.is({ content: jobId.toString() }),
          ]);

          if (invalidQuery) cy.do(resultRow.failed.is({ content: '' }));
          else cy.do(resultRow.failed.is({ content: recordsCount.toString() }));
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

  verifyLastLog(fileName, status) {
    const result = {
      fileName: MultiColumnListCell({ row: 0, columnIndex: 0 }),
      status: MultiColumnListCell({ row: 0, columnIndex: 1 }),
    };

    cy.do(result.status.is({ content: status }));

    const regex = new RegExp(`${fileName.slice(0, -4)}-\\d+.mrc`);

    cy.expect(result.fileName.has({ content: matching(regex) }));
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
