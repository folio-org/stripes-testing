import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Link,
  MultiSelect,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Select,
  TextField,
} from '../../../../interactors';

const resetAllButton = Button({ id: 'clickable-reset-all' });

// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => {
  cy.wait(1000);
};

export default {
  waitLoading: () => cy.expect(PaneHeader('User search').exists()),

  searchByStatus(status) {
    waitClick();
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    return cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click(),
    ]);
  },

  searchByUsername(username) {
    cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Username'),
      TextField({ id: 'input-user-search' }).fillIn(username),
      Button({ id: 'submit-user-search' }).click(),
    ]);
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

  selectUserFromList: (userName) => {
    cy.do(Pane({ id: 'users-search-results-pane' }).find(MultiColumnListCell(userName)).click());
  },

  openUser(userName) {
    return cy.do(Link({ href: including(userName) }).click());
  },

  openUserCard(userName) {
    this.searchByUsername(userName);
    this.openUser(userName);
  },

  openLostItemsRequiringActualCostPane() {
    cy.do([Button('Actions').click(), Button('Lost items requiring actual cost').click()]);
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

  resetAllFilters() {
    cy.do(resetAllButton.click());
  },
};
