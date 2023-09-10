import { Button, Modal } from '../../../../../interactors';

export default {
  deleteMaterialType: () => {
    cy.do(Modal('Delete Material type').find(Button('Delete')).click());
  },
};
