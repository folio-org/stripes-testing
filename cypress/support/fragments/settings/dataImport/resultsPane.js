import {
  Button,
  Form,
  HTML,
  MultiColumnListCell,
  Section,
  TextField,
  including,
  not,
} from '../../../../../interactors';

const resultsPane = Section({ id: 'pane-results' });
const actionsButton = resultsPane.find(Button('Actions'));

const searchForm = resultsPane.find(Form({ testId: 'search-form' }));
const searchInput = searchForm.find(TextField({ type: 'search' }));
const searchButton = searchForm.find(Button('Search'));

const searchResults = resultsPane.find(HTML({ className: including('searchResults-') }));
const noResultsText = 'The list contains no items';

export default {
  waitLoading() {
    cy.expect(resultsPane.exists());
  },
  expandActionsDropdown() {
    cy.do(actionsButton.click());
  },
  searchByName(name) {
    cy.do([searchInput.fillIn(name), searchButton.click()]);
    cy.wait(300);
  },
  checkResultsPaneIsEmpty({ isEmpty = true } = {}) {
    if (isEmpty) cy.expect(searchResults.has({ text: noResultsText }));
    else {
      cy.expect([
        searchResults.has({ text: not(including(noResultsText)) }),
        searchResults.find(MultiColumnListCell()).exists(),
      ]);
    }
  },

  clearSearchField() {
    cy.do(searchInput.clear());
    cy.expect(searchInput.has({ value: '' }));
  },
};
