import { Button, Modal, including } from '../../../../../interactors';
import InvoiceView from '../invoiceView';

const differentCurrencyConfirmationModal = Modal({
  id: 'invoice-line-currency-confirmation',
});
const cancelButton = differentCurrencyConfirmationModal.find(Button('Cancel'));
const confirmButton = differentCurrencyConfirmationModal.find(Button('Confirm'));
const message =
  'You are adding one or more purchase order lines that are in a different currency than the one identified on this invoice. If you would still like to add these please click confirm. Note: The cost will be recorded in the currency identified on the invoice.';

export default {
  verifyModalView() {
    cy.expect([
      differentCurrencyConfirmationModal.has({
        header: 'Confirmation',
      }),
      differentCurrencyConfirmationModal.has({
        message: including(message),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      confirmButton.has({ disabled: false, visible: true }),
    ]);
  },

  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(differentCurrencyConfirmationModal.absent());
    InvoiceView.waitLoading();
  },

  clickConfirmButton() {
    cy.do(confirmButton.click());
    cy.expect(differentCurrencyConfirmationModal.absent());
    InvoiceView.waitLoading();
  },
};
