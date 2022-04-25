import { Button, Modal } from '../../../../../interactors';

export default {
  confirmModal:() => {
    cy.do(Modal('Confirm item status: Missing').find(Button('Confirm')).click());
  },
};
