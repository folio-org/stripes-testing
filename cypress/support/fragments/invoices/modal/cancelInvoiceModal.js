import { Button, Modal, TextArea, including } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const cancelInvoiceConfirmationModal = Modal({
  id: 'cancel-invoice-confirmation',
});
const cancellationNoteTextArea = cancelInvoiceConfirmationModal.find(TextArea('Cancellation note'));
const cancelButton = cancelInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = cancelInvoiceConfirmationModal.find(Button('Submit'));
const message =
  'Are you sure you want to cancel this invoice? Any related transactions against funds will be voided.';

export default {
  verifyModalView() {
    cy.expect([
      cancelInvoiceConfirmationModal.has({
        header: 'Cancel invoice',
      }),
      cancelInvoiceConfirmationModal.has({
        message: including(message),
      }),
      cancellationNoteTextArea.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(cancelInvoiceConfirmationModal.absent());
  },
  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(cancelInvoiceConfirmationModal.absent());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCancelledMessage);
  },
};
