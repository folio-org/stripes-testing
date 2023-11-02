import { Button, Modal } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const payInvoiceConfirmationModal = Modal({
  id: 'pay-invoice-confirmation',
});
const cancelButton = payInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = payInvoiceConfirmationModal.find(Button('Submit'));

export default {
  verifyModalView() {
    cy.expect([
      payInvoiceConfirmationModal.has({
        header: 'Pay invoice',
      }),
      payInvoiceConfirmationModal.has({
        message: 'Are you sure you want to pay invoice?',
      }),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(payInvoiceConfirmationModal.absent());
  },
  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(payInvoiceConfirmationModal.absent());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoicePaidMessage);
  },
};
