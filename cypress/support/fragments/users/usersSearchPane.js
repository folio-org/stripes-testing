import { including } from '@interactors/html';
import {
  Accordion,
  Checkbox,
  TextField,
  Button,
  Link,
  PaneHeader,
  Pane,
  MultiColumnListCell,
  Select,
} from '../../../../interactors';

// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => { cy.wait(1000); };

export default {
  waitLoading:() => cy.expect(PaneHeader('User search').exists()),

  searchByStatus(status) {
    waitClick();
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    return cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click()
    ]);
  },

  searchByUsername(username) {
    cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Username'),
      TextField({ id: 'input-user-search' }).fillIn(username),
      Button({ id: 'submit-user-search' }).click()
    ]);
    waitClick();
  },

  selectUserFromList: (rowNumber = 0) => {
    cy.do(Pane({ id:'users-search-results-pane' }).click({ row: rowNumber }));
  },

  openUser(userId) {
    return cy.do(Link({ href: including(userId) }).click());
  },
};
