import { MultiColumnListCell } from '../../../../interactors';
import { MultiColumnListRow } from '../../../../interactors/multi-column-list';
import DateTools from '../../utils/dateTools';

const getSearchResult = (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col });
const getRowByContent = (content) => MultiColumnListCell(content).row();
const quickExportFileNameMask = /quick-export-\d{1,3}.mrc/gm;

export default {
  defaultJobProfile: 'Default instances export job profile',
  getSearchResult,
  verifyQuickExportResult() {
    cy.do([
      this.getSearchResult(0, 0).perform(element => {
        expect(element.innerText).to.match(quickExportFileNameMask);
      }),
      MultiColumnListCell({ row: 0, content: this.defaultJobProfile }).exists(),
    ]);
  },

  verifySuccessExportResultCells(resultFileName, recordsCount, jobId, userName = null, jobType = 'instances') {
    getRowByContent(resultFileName).then((row) => {
      const exportRow = MultiColumnListRow({ index: row });

      const resultRow = {
        fileName: exportRow.find(MultiColumnListCell({ columnIndex: 0 })),
        status: exportRow.find(MultiColumnListCell({ columnIndex: 1 })),
        total: exportRow.find(MultiColumnListCell({ columnIndex: 2 })),
        exported: exportRow.find(MultiColumnListCell({ columnIndex: 3 })),
        failed: exportRow.find(MultiColumnListCell({ columnIndex: 4 })),
        jobProfile: exportRow.find(MultiColumnListCell({ columnIndex: 5 })),
        endedRunning: exportRow.find(MultiColumnListCell({ columnIndex: 7 })),
        runBy: exportRow.find(MultiColumnListCell({ columnIndex: 8 })),
        id: exportRow.find(MultiColumnListCell({ columnIndex: 9 })),
      };
      cy.getAdminToken().then(() => {
        cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(() => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${Cypress.env('users')[0].personal.lastName}`;
          cy.do([
            resultRow.status.is({ content: 'Completed' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: recordsCount.toString() }),
            resultRow.failed.is({ content: '' }),
            resultRow.jobProfile.is({ content: `Default ${jobType} export job profile` }),
            resultRow.runBy.is({ content: userNameToVerify }),
            resultRow.id.is({ content: jobId.toString() })
          ]);
        });
      });

      // verify file name
      cy.do(
        resultRow.fileName.perform(element => {
          expect(element.innerText).to.equal(resultFileName);
          expect(element.innerText).to.include(`-${jobId}.mrc`);
        })
      );

      // verify date (ended running)
      const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
      cy.do(resultRow.endedRunning.perform(element => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }));
    });
  },

  verifyFailedExportResultCells(resultFileName, recordsCount, jobId, userName = null, jobType = 'instances') {
    getRowByContent(resultFileName).then((row) => {
      const exportRow = MultiColumnListRow({ index: row });

      const resultRow = {
        fileName: exportRow.find(MultiColumnListCell({ columnIndex: 0 })),
        status: exportRow.find(MultiColumnListCell({ columnIndex: 1 })),
        total: exportRow.find(MultiColumnListCell({ columnIndex: 2 })),
        exported: exportRow.find(MultiColumnListCell({ columnIndex: 3 })),
        failed: exportRow.find(MultiColumnListCell({ columnIndex: 4 })),
        jobProfile: exportRow.find(MultiColumnListCell({ columnIndex: 5 })),
        endedRunning: exportRow.find(MultiColumnListCell({ columnIndex: 7 })),
        runBy: exportRow.find(MultiColumnListCell({ columnIndex: 8 })),
        id: exportRow.find(MultiColumnListCell({ columnIndex: 9 })),
      };
      cy.getAdminToken().then(() => {
        cy.getUsers({ limit: 1, query: `username=${userName || Cypress.env('diku_login')}` }).then(() => {
          const userNameToVerify = `${Cypress.env('users')[0].personal.firstName} ${Cypress.env('users')[0].personal.lastName}`;
          cy.do([
            resultRow.status.is({ content: 'Fail' }),
            resultRow.total.is({ content: recordsCount.toString() }),
            resultRow.exported.is({ content: '' }),
            resultRow.failed.is({ content: recordsCount.toString() }),
            resultRow.jobProfile.is({ content: `Default ${jobType} export job profile` }),
            resultRow.runBy.is({ content: userNameToVerify }),
            resultRow.id.is({ content: jobId.toString() })
          ]);
        });
      });

      // verify file name
      cy.do(
        resultRow.fileName.perform(element => {
          expect(element.innerText).to.equal(resultFileName);
          expect(element.innerText).to.include(`-${jobId}.mrc`);
        })
      );

      // verify date (ended running)
      const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
      cy.do(resultRow.endedRunning.perform(element => {
        const actualDate = element.innerText;
        expect(actualDate).to.match(dateString);

        const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
        DateTools.verifyDate(dateWithUTC, 180000);
      }));
    });
  },
};
