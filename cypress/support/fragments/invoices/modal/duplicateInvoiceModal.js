import InvoiceView from '../invoiceView';
import { Button, Modal, including } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const duplicateInvoiceConfirmationModal = Modal({
  id: 'duplicate-invoice-confirmation',
});
const cancelButton = duplicateInvoiceConfirmationModal.find(Button('Cancel'));
const duplicateButton = duplicateInvoiceConfirmationModal.find(Button('Duplicate'));
const message =
  'Are you sure you want to create a duplicate of this invoice and all of its invoice lines?';

export default {
  verifyModalView() {
    cy.expect([
      duplicateInvoiceConfirmationModal.has({
        header: 'Duplicate invoice?',
      }),
      duplicateInvoiceConfirmationModal.has({
        message: including(message),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      duplicateButton.has({ disabled: false, visible: true }),
    ]);
  },

  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(duplicateInvoiceConfirmationModal.absent());
    InvoiceView.waitLoading();
  },

  clickDuplicateButton(isCheckSuccessCallout = true) {
    cy.do(duplicateButton.click());
    cy.expect(duplicateInvoiceConfirmationModal.absent());
    if (isCheckSuccessCallout) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceDuplicatedMessage);
    }
  },
};
