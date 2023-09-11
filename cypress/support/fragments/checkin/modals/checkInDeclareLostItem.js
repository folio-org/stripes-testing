import { Button, Modal, including, HTML } from '../../../../../interactors';

const checkInModal = Modal('Check in declared lost item?');
const confirmButton = Button('Confirm');
const cancelButton = Button('Cancel');

export default {
  verifyModalContent: (itemBarcode) => {
    cy.expect(HTML(including(itemBarcode)).exists());
  },
  confirm: () => {
    cy.do([confirmButton.exists(), confirmButton.click()]);
  },
  cancel: () => {
    cy.do([cancelButton.exists(), cancelButton.click()]);
  },
  verifyModalIsClosed() {
    cy.expect(checkInModal.absent());
  },
};
