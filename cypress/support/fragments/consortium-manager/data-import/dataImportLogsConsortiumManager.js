import {
  Button,
  HTML,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  SelectionList,
  Spinner,
  including,
  or,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, JOB_STATUS_NAMES, SORT_DIRECTIONS } from '../../../constants';
import MultiColumnListHelper from '../../multiColumnList';

const dataImportPane = Pane('Data import');
const logsList = dataImportPane.find(MultiColumnList());
const memberDropdownButton = Button({ id: 'consortium-member-select' });

export const DATA_IMPORT_LOGS_COLUMNS = {
  FILE_NAME: 'File name',
  STATUS: 'Status',
  RECORDS: 'Records',
  JOB_PROFILE: 'Job profile',
  STARTED_RUNNING: 'Started running',
  ENDED_RUNNING: 'Ended running',
  RUN_BY: 'Run by',
  ID: 'ID',
};

// "Status" column is sorted on the backend by job status code, not by displayed label
const STATUS_SORT_CODES = {
  [JOB_STATUS_NAMES.STOPPED_BY_USER]: 'CANCELLED',
  [JOB_STATUS_NAMES.COMPLETED]: 'COMMITTED',
  [JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS]: 'ERROR',
  [JOB_STATUS_NAMES.FAILED]: 'ERROR',
};

const getSortableValueByColumn = {
  [DATA_IMPORT_LOGS_COLUMNS.STATUS]: (value) => STATUS_SORT_CODES[value],
  [DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING]: (value) => new Date(value).getTime(),
  [DATA_IMPORT_LOGS_COLUMNS.ID]: (value) => Number(value),
};

export default {
  waitLoading() {
    cy.expect([dataImportPane.exists(), dataImportPane.find(Spinner()).absent()]);
    MultiColumnListHelper.waitLoadingComplete(logsList);
  },

  verifyLogsFound(count) {
    const subtitle =
      count === undefined
        ? ''
        : `${count.toLocaleString('en-US')} ${count === 1 ? 'log' : 'logs'} found`;
    cy.expect(dataImportPane.has({ subtitle }));
  },

  // Logs count, logs table and paginator are displayed only when logs of selected member are loaded
  verifyDataImportPane({ hasLogs = true } = {}) {
    if (hasLogs) this.waitLoading();
    cy.expect([
      dataImportPane.find(HTML({ className: including('appIcon') })).exists(),
      dataImportPane.find(memberDropdownButton).exists(),
    ]);
    if (hasLogs) {
      MultiColumnListHelper.assertColumns(logsList, Object.values(DATA_IMPORT_LOGS_COLUMNS));
      cy.expect([
        dataImportPane.has({ subtitle: including('found') }),
        dataImportPane
          .find(Button(COMMON_BUTTON_LABELS.PREVIOUS, { disabled: or(true, false) }))
          .exists(),
        dataImportPane
          .find(Button(COMMON_BUTTON_LABELS.NEXT, { disabled: or(true, false) }))
          .exists(),
      ]);
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
        .find(MultiColumnListCell({ content: including(fileName.replace(/\.mrc$/i, '')) }))
        .exists(),
    );
  },

  clickColumnHeader(column) {
    cy.intercept('GET', '**/metadata-provider/jobExecutions?*').as('getDataImportLogs');
    MultiColumnListHelper.sortListBy(logsList, column);
    cy.wait('@getDataImportLogs');
    MultiColumnListHelper.waitLoadingComplete(logsList);
  },

  verifyColumnSortDirection(column, sortDirection) {
    MultiColumnListHelper.assertColumnSortDirection(logsList, column, sortDirection);
  },

  verifyColumnIsNotSorted(column) {
    MultiColumnListHelper.assertColumnSortDirection(logsList, column, 'none');
  },

  verifyColumnValuesSorted(column, direction = SORT_DIRECTIONS.ASCENDING) {
    MultiColumnListHelper.assertColumnValuesSorted(logsList, column, {
      direction,
      getSortableValue: getSortableValueByColumn[column],
    });
  },

  verifyListSortedBy(column, direction = SORT_DIRECTIONS.ASCENDING) {
    this.verifyColumnSortDirection(column, direction);
    this.verifyColumnValuesSorted(column, direction);
  },

  getLogsTotalCountViaApi() {
    const searchParams = [
      'limit=1',
      'statusAny=COMMITTED',
      'statusAny=ERROR',
      'statusAny=CANCELLED',
      'subordinationTypeNotAny=COMPOSITE_PARENT',
      `excludeJobProfileName=${encodeURIComponent('Bulk operations data import job profile-*')}`,
    ].join('&');

    return cy
      .okapiRequest({
        path: `metadata-provider/jobExecutions?${searchParams}`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.totalRecords);
  },
};
