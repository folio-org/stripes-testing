import { Button, Modal, including, HTML } from '../../../../../interactors';

export default {
  checkContent:(quantityItem) => {
    cy.expect(Modal('Item not checked out')
      .find(HTML(including(`Patron has reached maximum limit of ${quantityItem} items for loan type`)))
      .exists());
  },

  cancelModal:() => {
    cy.do(Button('Close').click());
  },
};
