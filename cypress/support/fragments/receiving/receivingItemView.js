import { Button, Accordion } from '../../../../interactors';

export default {
  addPiece: () => {
    cy.do(Accordion({ id: 'expected' }).find(Button('Actions')).click());
    cy.do(Button('Add piece').click());
  },
};
