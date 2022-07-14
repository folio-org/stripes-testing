import { Button, Modal } from '../../../../interactors';

export default {
  confirmMultiplePiecesItemModal:() => {
    cy.do(Modal('Confirm multipiece check out').find(Button('Check out')).click());
  },
};
