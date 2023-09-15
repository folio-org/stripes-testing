/* eslint-disable no-dupe-keys */
import { including } from 'bigtest';
import {
  Button,
  MultiColumnListCell,
  Pane,
  TextField,
  Link,
  MultiColumnListHeader,
  MultiColumnListRow,
  Section,
  TextInput,
  Select,
} from '../../../../../interactors';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const searchButton = Button('Search', { type: 'submit' });
const browseInventoryPane = Pane('Browse inventory');
const inventoryPane = Pane('Inventory');
const searchFilterPane = Pane('Search & filter');
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const nextButton = Button({ id: 'browse-results-list-browseSubjects-next-paging-button' });
const previousButton = Button({ id: 'browse-results-list-browseSubjects-prev-paging-button' });
const mclhSubjectTitle = MultiColumnListHeader({ id: 'list-column-subject' });
const mclhNumberOfTTitle = MultiColumnListHeader({ id: 'list-column-numberoftitles' });
const recordSearch = TextInput({ id: 'input-record-search' });
const browseOptionSelect = Select('Search field index');

export default {
  verifySearchButtonDisabled() {
    cy.expect(searchButton.has({ disabled: true }));
  },

  verifyNonExistentSearchResult(searchString) {
    cy.expect(
      MultiColumnListCell({
        content: including(searchString),
        content: including('would be here'),
      }).exists(),
    );
  },

  verifyBrowseInventoryPane() {
    cy.expect([browseInventoryPane.exists(), searchFilterPane.exists()]);
  },

  verifyInventoryPane() {
    cy.expect(inventoryPane.exists());
  },

  verifyClickTakesNowhere(text) {
    this.verifyBrowseInventoryPane();
    cy.do(
      MultiColumnListCell({
        content: including(text),
        content: including('would be here'),
      }).click(),
    );
    this.verifyBrowseInventoryPane();
  },

  verifyClickTakesToInventory(text) {
    this.verifyBrowseInventoryPane();
    cy.do(
      MultiColumnListCell({ content: including(text) })
        .find(Link())
        .click(),
    );
    InventorySearchAndFilter.waitLoading();
    InventorySearchAndFilter.verifySearchResult(text);
  },

  checkSearchResultsTable() {
    cy.expect([
      mclhSubjectTitle.has({ content: 'Subject' }),
      mclhNumberOfTTitle.has({ content: 'Number of titles' }),
    ]);
  },

  checkResultAndItsRow(rowIndex, value) {
    cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}` }).has({ content: value }));
  },

  checkAbsenceOfResultAndItsRow(rowIndex, value) {
    cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}`, content: value }).absent());
  },

  checkPaginationButtons() {
    cy.expect([
      previousButton.is({ visible: true, disabled: false }),
      nextButton.is({ visible: true, disabled: false }),
    ]);
  },

  clickNextPaginationButton() {
    cy.do(inventorySearchResultsPane.find(nextButton).click());
  },

  clickPreviousPaginationButton() {
    cy.do(inventorySearchResultsPane.find(previousButton).click());
  },

  clearSearchTextfield() {
    cy.do(TextField({ id: 'input-record-search' }).clear());
  },

  verifySearchTextFieldEmpty() {
    cy.get('#input-record-search').then((element) => {
      const searchText = element.attr('value');
      if (searchText) this.clearSearchTextfield();
    });
  },

  searchBrowseSubjects(searchString) {
    InventorySearchAndFilter.selectBrowseSubjects();
    this.verifySearchTextFieldEmpty();
    this.verifySearchButtonDisabled();
    InventorySearchAndFilter.browseSearch(searchString);
  },

  checkAuthorityIconAndValueDisplayedForRow(rowIndex, value) {
    cy.expect([
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ content: including(value) }),
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ innerHTML: including('<img') }),
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({
        innerHTML: including('alt="MARC Authorities module">'),
      }),
    ]);
  },

  checkNoAuthorityIconDisplayedForRow(rowIndex, value) {
    cy.expect([
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ content: including(value) }),
      MultiColumnListCell({
        row: rowIndex,
        columnIndex: 0,
        innerHTML: including('alt="MARC Authorities module">'),
      }).absent(),
    ]);
  },

  checkRowValueIsBold(rowNumber, value) {
    cy.expect(
      MultiColumnListCell({ row: rowNumber, columnIndex: 0 }).has({
        innerHTML: including(`<strong>${value}</strong>`),
      }),
    );
  },

  checkValueIsBold(value) {
    cy.expect(MultiColumnListCell({ innerHTML: including(`<strong>${value}</strong>`) }).exists());
  },

  browse(subjectName) {
    cy.do(recordSearch.fillIn(subjectName));
    cy.expect([recordSearch.has({ value: subjectName }), searchButton.has({ disabled: false })]);
    cy.do(searchButton.click());
  },

  select() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(browseOptionSelect.choose('Subjects'));
    cy.expect(browseOptionSelect.has({ value: 'browseSubjects' }));
  },

  checkValueAbsentInRow(rowIndex, value) {
    cy.expect(
      MultiColumnListCell({ row: rowIndex, columnIndex: 0, content: including(value) }).absent(),
    );
  },

  checkRowWithValueAndNoAuthorityIconExists(value) {
    cy.expect(MultiColumnListCell({ columnIndex: 0, content: value }).exists());
  },

  checkRowWithValueAndAuthorityIconExists(value) {
    cy.expect(
      MultiColumnListCell({
        columnIndex: 0,
        content: 'Linked to MARC authority' + value,
      }).exists(),
    );
  },
};
