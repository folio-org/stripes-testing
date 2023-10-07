import { Button, Modal } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const approveInvoiceConfirmationModal = Modal({ id: 'approve-invoice-confirmation' });
const cancelButton = approveInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = approveInvoiceConfirmationModal.find(Button('Submit'));

export default {
  verifyModalView() {
    cy.expect([
      approveInvoiceConfirmationModal.has({
        header: 'Approve invoice',
      }),
      approveInvoiceConfirmationModal.has({ message: 'Are you sure you want to approve invoice?' }),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
  },
  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceApprovedMessage);
  },
};
