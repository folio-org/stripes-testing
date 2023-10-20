import { Button, Modal, matching } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const approveInvoiceConfirmationModal = Modal({
  id: matching(/approve(?:-pay)*-invoice-confirmation/),
});
const cancelButton = approveInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = approveInvoiceConfirmationModal.find(Button('Submit'));

export default {
  verifyModalView({ isApprovePayEnabled = false } = {}) {
    cy.expect([
      approveInvoiceConfirmationModal.has({
        header: `Approve ${isApprovePayEnabled ? '& pay ' : ''}invoice`,
      }),
      approveInvoiceConfirmationModal.has({
        message: `Are you sure you want to approve ${
          isApprovePayEnabled ? 'and pay ' : ''
        }invoice?`,
      }),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
  },
  clickSubmitButton({ isApprovePayEnabled = false } = {}) {
    cy.do(submitButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
    InteractorsTools.checkCalloutMessage(
      isApprovePayEnabled
        ? InvoiceStates.invoiceApprovedAndPaidMessage
        : InvoiceStates.invoiceApprovedMessage,
    );
  },
};
