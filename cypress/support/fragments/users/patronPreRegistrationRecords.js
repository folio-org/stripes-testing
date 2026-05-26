import { including } from '@interactors/html';
import {
  Button,
  HTML,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  TextField,
} from '../../../../interactors';
import MultiColumnListHelper from '../multiColumnList';

const resultsPaneTitle = 'Patron preregistration record results';
const emptyResultsText = 'Enter a search query to show results.';
const listId = 'PatronsPreRegistrationsList';
const listSelector = `[id="${listId}"]`;
const searchFieldId = 'stagingRecordsSearch';
const searchButtonId = 'stagingRecordsSearchButton';

const resultsPane = Pane({ id: 'stagingRecordsListPane' });
const recordsList = MultiColumnList({ id: listId });
const actionColumn = 'Action';
const newRecordButtonLabel = 'New';

const numericComparator = (leftValue, rightValue) => leftValue - rightValue;

const columnSortOptions = {
  'Email verification': {
    getSortableValue: (value) => {
      const normalized = `${value}`.toLowerCase();

      return normalized.includes('not') ? 0 : 1;
    },
    comparator: numericComparator,
  },
  'Submission date': {
    getSortableValue: (value) => new Date(value).getTime(),
    comparator: numericComparator,
  },
};

export default {
  waitLoading() {
    cy.expect(PaneHeader(resultsPaneTitle).exists());
    MultiColumnListHelper.waitLoadingComplete(recordsList);
  },

  verifyResultsPaneOpened() {
    cy.expect([resultsPane.exists(), PaneHeader(resultsPaneTitle).exists()]);
  },

  verifyEnterSearchQueryMessageVisible() {
    cy.expect(resultsPane.find(HTML(including(emptyResultsText))).exists());
  },

  verifyEnterSearchQueryMessageHidden() {
    cy.expect(resultsPane.find(HTML(including(emptyResultsText))).absent());
  },

  searchByQuery(query) {
    cy.do(TextField({ id: searchFieldId }).fillIn(query));
    cy.do(Button({ id: searchButtonId }).click());
    this.waitLoading();
  },

  verifyResultsCount(count) {
    MultiColumnListHelper.assertRowCount(recordsList, count);
  },

  verifyColumns(columns) {
    MultiColumnListHelper.assertColumns(recordsList, columns);
  },

  verifyActionColumnContainsNewButtonInEachRow() {
    cy.then(() => recordsList.rowCount()).then((rowCount) => {
      for (let i = 0; i < rowCount; i++) {
        cy.expect(
          recordsList
            .find(MultiColumnListRow({ indexRow: `row-${i}` }))
            .find(MultiColumnListCell({ column: actionColumn }))
            .find(Button(newRecordButtonLabel))
            .exists(),
        );
      }
    });
  },

  clickColumnHeader(columnName) {
    MultiColumnListHelper.sortListBy(recordsList, columnName);
  },

  clickActionHeader() {
    // eslint-disable-next-line cypress/no-force
    cy.contains(`${listSelector} [role="columnheader"]`, 'Action')
      .scrollIntoView()
      .click({ force: true });
  },

  verifyColumnSortDirection(columnName, direction) {
    MultiColumnListHelper.assertColumnSortDirection(recordsList, columnName, direction);
  },

  verifyColumnIsSortable(columnName, isSortable = true) {
    MultiColumnListHelper.assertColumnSortable(recordsList, columnName, isSortable);
  },

  getColumnValues(columnName) {
    return MultiColumnListHelper.getColumnValues(recordsList, columnName);
  },

  getVisibleFirstNames() {
    return this.getColumnValues('First name');
  },

  verifyRowsCellsContent(rowsConfig) {
    MultiColumnListHelper.assertRowsCellsContent(recordsList, rowsConfig);
  },

  verifyVisibleFirstNames(expectedFirstNames) {
    this.getVisibleFirstNames().then((firstNames) => {
      expect(firstNames).to.deep.equal(expectedFirstNames);
    });
  },

  verifyColumnValuesNotSorted(columnName) {
    return MultiColumnListHelper.assertColumnValuesNotSorted(recordsList, columnName);
  },

  verifyColumnValuesSorted(columnName, direction) {
    return MultiColumnListHelper.assertColumnValuesSorted(recordsList, columnName, {
      direction,
      ...(columnSortOptions[columnName] || {}),
    });
  },
};
