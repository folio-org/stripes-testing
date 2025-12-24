import { including } from '@interactors/html';
import { ListRow, MultiColumnListCell } from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const getResultRow = (resultFileName) => {
  const row = ListRow({ content: including(resultFileName) });

  return {
    fileName: row.find(MultiColumnListCell({ column: 'File name' })),
    status: row.find(MultiColumnListCell({ column: 'Status' })),
    total: row.find(MultiColumnListCell({ column: 'Total' })),
    exported: row.find(MultiColumnListCell({ column: 'Exported' })),
    failed: row.find(MultiColumnListCell({ column: 'Failed' })),
    jobProfile: row.find(MultiColumnListCell({ column: 'Job profile' })),
    endedRunning: row.find(MultiColumnListCell({ column: 'Ended running' })),
    runBy: row.find(MultiColumnListCell({ column: 'Run by' })),
    id: row.find(MultiColumnListCell({ column: 'ID' })),
  };
};

const verifyFileName = (resultRow, resultFileName, jobId) => {
  cy.do(
    resultRow.fileName.perform((element) => {
      expect(element.innerText).to.equal(resultFileName);
      expect(element.innerText).to.include(`-${jobId}.mrc`);
    }),
  );
};

const verifyEndedRunningDate = (resultRow) => {
  const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
  cy.do(
    resultRow.endedRunning.perform((element) => {
      const actualDate = element.innerText;
      expect(actualDate).to.match(dateString);

      const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
      DateTools.verifyDate(dateWithUTC, 180000);
    }),
  );
};

const verifyCommonFields = (resultRow, jobId, user, jobType) => {
  const userNameToVerify = `${user.lastName}, ${user.firstName}`;

  cy.expect([
    resultRow.jobProfile.is({ content: `${jobType} export job profile` }),
    resultRow.runBy.is({ content: userNameToVerify }),
    resultRow.id.is({ content: jobId.toString() }),
  ]);
};

export default {
  verifySuccessExportResultCells(
    resultFileName,
    recordsCount,
    jobId,
    user,
    jobType = 'Default instances',
  ) {
    const resultRow = getResultRow(resultFileName);

    cy.expect([
      resultRow.status.is({ content: 'Completed' }),
      resultRow.total.is({ content: recordsCount.toString() }),
      resultRow.exported.is({ content: recordsCount.toString() }),
      resultRow.failed.is({ content: '' }),
    ]);

    verifyCommonFields(resultRow, jobId, user, jobType);
    verifyFileName(resultRow, resultFileName, jobId);
    verifyEndedRunningDate(resultRow);
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
    const resultRow = getResultRow(resultFileName);
    const failedRecordsCount = totalRecordsCount - exportedRecordsCount;

    cy.expect([
      resultRow.status.is({ content: 'Completed with errors' }),
      resultRow.total.is({ content: totalRecordsCount.toString() }),
      resultRow.exported.is({ content: exportedRecordsCount.toString() }),
    ]);

    if (invalidQuery) {
      cy.expect(resultRow.failed.is({ content: '' }));
    } else {
      cy.expect(resultRow.failed.is({ content: failedRecordsCount.toString() }));
    }

    verifyCommonFields(resultRow, jobId, user, jobType);
    verifyFileName(resultRow, resultFileName, jobId);
    verifyEndedRunningDate(resultRow);
  },
};
