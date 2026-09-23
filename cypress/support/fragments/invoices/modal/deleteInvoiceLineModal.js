import { Button, Modal, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const deleteInvoiceLineConfirmationModal = Modal({
  id: 'delete-invoice-line-confirmation',
});
const cancelButton = deleteInvoiceLineConfirmationModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const deleteButton = deleteInvoiceLineConfirmationModal.find(Button(COMMON_BUTTON_LABELS.DELETE));
const message = 'Delete invoice line?';

export default {
  verifyModalView(invoiceLineNumber) {
    cy.expect([
      deleteInvoiceLineConfirmationModal.has({
        header: `Delete ${invoiceLineNumber}?`,
      }),
      deleteInvoiceLineConfirmationModal.has({
        message: including(message),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      deleteButton.has({ disabled: false, visible: true }),
    ]);
  },

  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(deleteInvoiceLineConfirmationModal.absent());
  },

  clickDeleteButton(isCheckSuccessCallout = true) {
    cy.do(deleteButton.click());
    cy.expect(deleteInvoiceLineConfirmationModal.absent());
    if (isCheckSuccessCallout) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineDeletedMessage);
    }
  },
};
