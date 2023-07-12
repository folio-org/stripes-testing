import { Button, MultiColumnListCell, Pane, TextField, Link, MultiColumnListHeader, MultiColumnListRow, Section } from '../../../../../interactors';
import { including } from 'bigtest';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const searchButton = Button('Search');
const browseInventoryPane = Pane('Browse inventory');
const searchFilterPane = Pane('Search & filter');
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const nextButton = Button({ id: 'browse-results-list-browseSubjects-next-paging-button' });
const previousButton = Button({ id: 'browse-results-list-browseSubjects-prev-paging-button' });
const mclhSubjectTitle = MultiColumnListHeader({ id: 'list-column-subject' });
const mclhNumberOfTTitle = MultiColumnListHeader({ id: 'list-column-numberoftitles' });

export default {
  verifySearchButtonDisabled() {
    cy.expect(searchButton.has({ disabled: true }));
  },

  verifyNonExistentSearchResult(searchString) {
    cy.expect(MultiColumnListCell({ content: including(searchString), content: including('would be here') }).exists());
  },

  verifyBrowseInventoryPane() {
    cy.expect([
      browseInventoryPane.exists(),
      searchFilterPane.exists(),
    ]);
  },

  verifyClickTakesNowhere(text) {
    this.verifyBrowseInventoryPane();
    cy.do(MultiColumnListCell({ content: including(text), content: including('would be here') }).click());
    this.verifyBrowseInventoryPane();
  },

  verifyClickTakesToInventory(text) {
    this.verifyBrowseInventoryPane();
    cy.do(MultiColumnListCell({ content: including(text) }).find(Link()).click());
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
}