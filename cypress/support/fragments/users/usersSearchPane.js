import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  Pane,
  PaneHeader,
  Select,
  TextField,
} from '../../../../interactors';

const searchPaneTitle = 'Search & filter';
const resultsPane = Pane({ id: 'users-search-results-pane' });
const collapseSearchPaneButton = Button({
  ariaLabelledby: 'collapse-filter-pane-button-tooltip-text',
});
const expandSearchPaneButton = Button({ ariaLabelledby: 'expand-filter-pane-button-tooltip-text' });

// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => {
  cy.wait(1500);
};

export default {
  waitLoading() {
    cy.wait(500);
    cy.expect(PaneHeader('User search results').exists());
    cy.wait(500);
  },

  searchByStatus(status) {
    waitClick();
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    cy.wait(500);
    cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click(),
    ]);
    cy.wait(1000);
  },

  verifyKeywordSearchOptionSelected() {
    cy.expect(
      Select({ id: 'input-user-search-qindex' }).has({
        checkedOptionText: 'Keyword (name, username, email, identifier, custom fields)',
      }),
    );
  },

  searchByUsername(username) {
    cy.do(Select({ id: 'input-user-search-qindex' }).choose('Username'));
    cy.do(TextField({ id: 'input-user-search' }).fillIn(username));
    cy.do(Button({ id: 'submit-user-search' }).click());
    waitClick();
  },

  searchByLastName(lastName) {
    cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Last name'),
      TextField({ id: 'input-user-search' }).fillIn(lastName),
      Button({ id: 'submit-user-search' }).click(),
    ]);
    waitClick();
  },

  searchByBarcode(barcode) {
    cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Barcode'),
      TextField({ id: 'input-user-search' }).fillIn(barcode),
      Button({ id: 'submit-user-search' }).click(),
    ]);
    waitClick();
  },

  selectUserFromList: (userName) => {
    cy.do(Pane({ id: 'users-search-results-pane' }).find(MultiColumnListCell(userName)).click());
    cy.wait(1000);
  },

  openUser(userName) {
    return cy.do(Link({ href: including(userName) }).click());
  },

  verifyUserIsAbsentInSearchResults(userName) {
    cy.expect(
      Pane({ id: 'users-search-results-pane' })
        .find(MultiColumnListRow({ content: including(userName) }))
        .absent(),
    );
  },

  openUserCard(userName) {
    this.searchByUsername(userName);
    this.openUser(userName);
  },

  openLostItemsRequiringActualCostPane() {
    cy.do([Button('Actions').click(), Button('Lost items requiring actual cost').click()]);
  },

  openPatronPreRegistrationRecords() {
    cy.do(Button('Actions').click());
    cy.expect(Button('Search patron preregistration records').exists());
    cy.do(Button('Search patron preregistration records').click());
  },

  verifyLostItemsRequiringActualCostOptionNotDisplayed() {
    cy.do(Button('Actions').click());
    cy.expect(Button('Lost items requiring actual cost').absent());
  },

  chooseTagOption: (tagName) => {
    cy.do([
      MultiSelect({ ariaLabelledby: 'users-filter-accordion-tags' }).select([including(tagName)]),
    ]);
  },

  unselectTagOption: () => {
    cy.do(MultiSelect({ ariaLabelledby: 'users-filter-accordion-tags' }).clear());
    cy.wait(1000);
  },

  selectActiveUsersStatusFilter() {
    this.searchByStatus('Active');
  },

  unselectActiveUsersStatusFilter() {
    this.searchByStatus('Active');
  },

  clearSearchField() {
    // There is no clear button for the search field, so we need to clear it
    // by filling in an empty string.
    cy.do(TextField({ id: 'input-user-search' }).fillIn(''));
  },

  resetAllFilters() {
    cy.get('#clickable-reset-all').then(($button) => {
      if (!$button.prop('disabled')) {
        cy.wrap($button).click();
      } else {
        cy.log('Reset all button is disabled!!!');
      }
    });

    cy.wait(3000);
  },

  clickOnUserRowContaining(text) {
    cy.do(
      Pane({ id: 'users-search-results-pane' })
        .find(MultiColumnListRow(including(text), { isContainer: false }))
        .find(Link())
        .click(),
    );
  },
  closeUserDetailsPane: () => {
    cy.get(
      Pane({ id: 'pane-userdetails' })
        .find(Button({ ariaLabel: 'Close ' }))
        .click(),
    );
  },

  tabToCollapseSearchPaneButton() {
    // Keyboard navigation starts at the "Search & filter" pane header (a focusable region),
    // so the next Tab moves focus to its "Collapse Search & filter pane" button
    cy.do(PaneHeader(searchPaneTitle).focus());
    cy.realPress('Tab');
    this.verifyCollapseSearchPaneButtonFocused();
  },

  // key: 'Enter' or 'Space'; activates the focused Expand/Collapse button
  pressKeyOnFocusedPaneButton(key) {
    cy.realPress(key);
  },

  pressTab() {
    cy.realPress('Tab');
  },

  verifySearchPaneCollapsed() {
    cy.expect([Pane(searchPaneTitle).absent(), expandSearchPaneButton.exists()]);
  },

  verifySearchPaneExpanded() {
    cy.expect([Pane(searchPaneTitle).exists(), collapseSearchPaneButton.exists()]);
  },

  verifyCollapseSearchPaneButtonFocused() {
    cy.expect(collapseSearchPaneButton.has({ focused: true }));
  },

  verifyExpandSearchPaneButtonFocused() {
    cy.expect(expandSearchPaneButton.has({ focused: true }));
  },

  verifyResultsPaneActionsButtonFocused() {
    cy.expect(resultsPane.find(Button('Actions')).has({ focused: true }));
  },
};
