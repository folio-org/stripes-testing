import { Button, Modal, including } from '../../../../../interactors';

const duplicateConfirmationModal = Modal('Duplicate order?');
const cancelButton = duplicateConfirmationModal.find(Button('Cancel'));
const duplicateButton = duplicateConfirmationModal.find(
  Button({ id: 'clickable-order-clone-confirmation-confirm' }),
);

export default {
  verifyModalView() {
    cy.expect([
      duplicateConfirmationModal.exists(),
      duplicateConfirmationModal.has({
        message: including(
          'Are you sure you want to clone this purchase order and all of its purchase order lines?',
        ),
      }),
      cancelButton.has({ disabled: false }),
      duplicateButton.has({ disabled: false, text: 'Duplicate' }),
    ]);
  },
  confirm() {
    cy.do(duplicateButton.click());
    cy.expect(duplicateConfirmationModal.absent());
  },
};
