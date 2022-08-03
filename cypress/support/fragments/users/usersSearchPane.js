import { including } from '@interactors/html';
import {
  Accordion,
  Checkbox,
  TextField,
  Button,
  Link,
  PaneHeader,
} from '../../../../interactors';

export default {
  waitLoading:() => cy.expect(PaneHeader('User search').exists()),

  searchByStatus(status) {
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click()
    ]);
  },

  openUser(userId) {
    cy.do(Link({ href: including(userId) }).click());
  },
};
