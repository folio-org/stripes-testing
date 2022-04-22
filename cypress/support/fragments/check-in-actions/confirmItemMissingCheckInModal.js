import { Button, Modal } from '../../../../interactors';

export default {
  confirmModal() {
    cy.do(Modal('Check in missing item?').find(Button('Confirm')).click());
  },
};
