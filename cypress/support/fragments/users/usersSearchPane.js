import { including } from '@interactors/html';
import {
  Accordion,
  Checkbox,
  TextField,
  Button,
  Link,
  PaneHeader,
  Pane,
  MultiColumnListCell
} from '../../../../interactors';

export default {
  waitLoading:() => cy.expect(PaneHeader('User search').exists()),

  searchByStatus(status) {
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    return cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click()
    ]);
  },

  selectUserFromList: (userName) => {
    cy.do(Pane({ id:'users-search-results-pane' }).find(MultiColumnListCell(userName)).click());
  },

  openUser(userId) {
    return cy.do(Link({ href: including(userId) }).click());
  },
};
