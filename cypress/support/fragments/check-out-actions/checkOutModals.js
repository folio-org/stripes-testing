import { Button, Modal } from '../../../../interactors';

const modal = Modal('Confirm multipiece check out');

export default {
  confirmMultipieceCheckOut:() => {
    cy.do(modal.find(Button('Check out')).click());
    cy.expect(modal.absent());
  },

  cancelMultipleCheckOut:() => {
    cy.do(modal.find(Button('Cancel')).click());
    cy.expect(modal.absent());
  }
};

