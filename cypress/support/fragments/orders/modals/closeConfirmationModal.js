import { Button, Modal, TextArea, including } from '../../../../../interactors';
import OrderStates from '../orderStates';
import InteractorsTools from '../../../utils/interactorsTools';

const closeConfirmationModal = Modal(including('Close - purchase order'));
const notesTextArea = closeConfirmationModal.find(TextArea('Notes'));
const cancelButton = closeConfirmationModal.find(Button('Cancel'));
const submitButton = closeConfirmationModal.find(Button('Submit'));

export default {
  verifyModalView({ orderNumber }) {
    cy.expect([
      closeConfirmationModal.has({
        header: including(`Close - purchase order - ${orderNumber}`),
      }),
      notesTextArea.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(closeConfirmationModal.absent());
  },
  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(closeConfirmationModal.absent());

    InteractorsTools.checkCalloutMessage(OrderStates.orderClosedSuccessfully);
  },
};
