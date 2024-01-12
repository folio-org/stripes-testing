import { Button, Form, HTML, Section, TextField, including } from '../../../../../interactors';

const resultsPane = Section({ id: 'pane-results' });
const actionsButton = resultsPane.find(Button('Actions'));

const searchForm = resultsPane.find(Form({ testId: 'search-form' }));
const searchInput = searchForm.find(TextField({ type: 'search' }));
const searchButton = searchForm.find(Button('Search'));

const searchResults = resultsPane.find(HTML({ className: including('searchResults-') }));

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
  checkResultsPaneIsEmpty() {
    cy.expect(searchResults.has({ text: 'The list contains no items' }));
  },
};
