import { Button, TextField, Pane } from '../../../../interactors';

export default {
  search(name) {
    cy.wait(1500);
    cy.do(TextField({ id: 'input-license-search' }).fillIn(name));
    cy.do(Pane({ id: 'pane-license-filters' }).find(Button('Search')).click());
  },
};
