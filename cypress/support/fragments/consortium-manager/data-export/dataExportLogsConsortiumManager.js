import {
  Button,
  HTML,
  ListRow,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  SelectionList,
  Spinner,
  including,
  or,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, SORT_DIRECTIONS } from '../../../constants';
import DateTools from '../../../utils/dateTools';
import MultiColumnListHelper from '../../multiColumnList';

const dataExportPane = Pane('Data export');
const logsList = dataExportPane.find(MultiColumnList());
const memberDropdownButton = Button({ id: 'consortium-member-select' });

export const DATA_EXPORT_LOGS_COLUMNS = {
  FILE_NAME: 'File name',
  STATUS: 'Status',
  TOTAL: 'Total',
  EXPORTED: 'Exported',
  FAILED: 'Failed',
  JOB_PROFILE: 'Job profile',
  STARTED_RUNNING: 'Started running',
  ENDED_RUNNING: 'Ended running',
  RUN_BY: 'Run by',
  ID: 'ID',
};

// "Total" values are displayed as formatted numbers (e.g. "1,000")
const toNumber = (value) => Number(value.replace(/,/g, ''));

const getSortableValueByColumn = {
  [DATA_EXPORT_LOGS_COLUMNS.TOTAL]: toNumber,
  [DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING]: (value) => new Date(value).getTime(),
  [DATA_EXPORT_LOGS_COLUMNS.ID]: toNumber,
};

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

  verifyDeletedJobProfileNotationInConsortiumManager(profileName) {
    cy.expect(MultiColumnListCell({ content: `${profileName} (deleted)` }).exists());
  },

  verifyFileNameReadOnlyInConsortiumManager(fileName) {
    cy.expect(
      MultiColumnListCell({ content: including(fileName) })
        .find(Button())
        .absent(),
    );
  },

  verifyErrorLogsDoNotOpenInConsortiumManager(fileName) {
    cy.do(MultiColumnListCell({ content: including(fileName) }).click());
    cy.wait(1000);
    cy.get('[class^="errorLogsContainer"]').should('not.exist');
  },

  waitLoading() {
    cy.expect([dataExportPane.exists(), dataExportPane.find(Spinner()).absent()]);
    MultiColumnListHelper.waitLoadingComplete(logsList);
  },

  verifyRecordsFound(count) {
    const subtitle =
      count === undefined
        ? ''
        : `${count.toLocaleString('en-US')} ${count === 1 ? 'record' : 'records'} found`;
    cy.expect(dataExportPane.has({ subtitle }));
  },

  verifyDataExportPane({ hasLogs = true } = {}) {
    if (hasLogs) this.waitLoading();
    cy.expect([
      dataExportPane.find(HTML({ className: including('appIcon') })).exists(),
      dataExportPane.find(memberDropdownButton).exists(),
    ]);
    if (hasLogs) {
      cy.expect([
        dataExportPane.has({ subtitle: including('found') }),
        dataExportPane
          .find(Button(COMMON_BUTTON_LABELS.PREVIOUS, { disabled: or(true, false) }))
          .exists(),
        dataExportPane
          .find(Button(COMMON_BUTTON_LABELS.NEXT, { disabled: or(true, false) }))
          .exists(),
      ]);
      Object.values(DATA_EXPORT_LOGS_COLUMNS).forEach((column) => {
        // Some columns are out of view and require horizontal scroll
        cy.do(logsList.scrollHeaderIntoView(column));
        cy.expect(logsList.find(MultiColumnListHeader(column)).exists());
      });
    }
  },

  verifyMemberDropdownFilterPlaceholder() {
    cy.do(memberDropdownButton.click());
    cy.expect(SelectionList({ placeholder: 'Filter options list' }).exists());
    cy.do(memberDropdownButton.click());
    cy.expect(SelectionList().absent());
  },

  verifyLogWithFileNameDisplayed(fileName) {
    cy.expect(
      logsList
        .find(MultiColumnListCell({ content: including(fileName.replace(/\.csv$/i, '')) }))
        .exists(),
    );
  },

  clickColumnHeader(column) {
    cy.intercept('GET', '**/data-export/job-executions?*').as('getDataExportLogs');
    MultiColumnListHelper.sortListBy(logsList, column);
    cy.wait('@getDataExportLogs');
    MultiColumnListHelper.waitLoadingComplete(logsList);
  },

  verifyColumnIsNotSorted(column) {
    MultiColumnListHelper.assertColumnSortDirection(logsList, column, 'none');
  },

  verifyListSortedBy(column, direction = SORT_DIRECTIONS.ASCENDING) {
    MultiColumnListHelper.assertColumnSortDirection(logsList, column, direction);
    MultiColumnListHelper.assertColumnValuesSorted(logsList, column, {
      direction,
      getSortableValue: getSortableValueByColumn[column],
    });
  },

  getRecordsTotalCountViaApi() {
    return cy
      .okapiRequest({
        path: 'data-export/job-executions',
        searchParams: {
          query: 'status=(COMPLETED or COMPLETED_WITH_ERRORS or FAIL)',
          limit: 1,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.totalRecords);
  },
};
