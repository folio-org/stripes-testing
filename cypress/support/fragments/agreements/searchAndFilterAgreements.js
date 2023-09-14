import { Button, TextField, Pane } from '../../../../interactors';

export default {
  search(name) {
    cy.wait(1500);
    cy.do(TextField({ id: 'input-agreement-search' }).fillIn(name));
    cy.do(Pane({ id: 'agreements-tab-filter-pane' }).find(Button('Search')).click());
  },
};
