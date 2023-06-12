import { Button, MultiColumnListCell, Pane, TextField, Link } from '../../../../../interactors';
import { including } from 'bigtest';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const searchButton = Button('Search');
const browseInventoryPane = Pane('Browse inventory');
const searchFilterPane = Pane('Search & filter');

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