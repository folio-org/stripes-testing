import { Button } from '../../../../interactors';

export default {
  createPiece: () => {
    cy.do(Button('Save & close').click());
  },
};
