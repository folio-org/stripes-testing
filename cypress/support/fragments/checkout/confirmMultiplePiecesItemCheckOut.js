import { Button, Modal, MultiColumnListRow } from '../../../../interactors';

export default {
  confirmMultiplePiecesItemModal:() => {
    cy.do(Modal('Confirm multipiece check out').find(Button('Check out')).click());
    cy.expect(MultiColumnListRow().exists());
  },
};
