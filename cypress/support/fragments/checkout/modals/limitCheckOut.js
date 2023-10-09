import { Button, Modal, including, HTML } from '../../../../../interactors';

export default {
  verifyErrorMessage: (quantityItem) => {
    cy.wait(1500);
    cy.expect(
      Modal('Item not checked out')
        .find(
          HTML(
            including(`Patron has reached maximum limit of ${quantityItem} items for loan type.`),
          ),
        )
        .exists(),
    );
  },

  cancelModal: () => {
    cy.do(Button('Close').click());
  },
};
