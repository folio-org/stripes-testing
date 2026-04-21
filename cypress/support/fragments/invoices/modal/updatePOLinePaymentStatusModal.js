import { Button, Modal, RadioButton, including } from '../../../../../interactors';
import { INVOICE_POL_PAYMENT_STATUSES } from '../../../constants';

const cancelInvoiceConfirmationModal = Modal({
  id: 'cancel-invoice-confirmation',
});

const paymentStatusesRadioButtons = {
  [INVOICE_POL_PAYMENT_STATUSES.NO_CHANGE_UI]: () => cancelInvoiceConfirmationModal.find(RadioButton('No change')),
  [INVOICE_POL_PAYMENT_STATUSES.AWAITING_PAYMENT_UI]: () => cancelInvoiceConfirmationModal.find(RadioButton('Awaiting payment')),
  [INVOICE_POL_PAYMENT_STATUSES.PARTIALLY_PAID_UI]: () => cancelInvoiceConfirmationModal.find(RadioButton('Partially paid')),
  [INVOICE_POL_PAYMENT_STATUSES.FULLY_PAID_UI]: () => cancelInvoiceConfirmationModal.find(RadioButton('Fully paid')),
  [INVOICE_POL_PAYMENT_STATUSES.CANCELLED]: () => cancelInvoiceConfirmationModal.find(RadioButton('Cancelled')),
};
const paymentStatusesRadioButtonsOptions = Object.values(paymentStatusesRadioButtons);
const cancelButton = cancelInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = cancelInvoiceConfirmationModal.find(Button('Submit'));
const message =
  'You are processing this invoice against a previous fiscal year and "release encumbrance" equals true for one or more invoice lines. One or more related orders has a type of One-time. Please indicate how the payment status of these order lines should be updated?';

export default {
  verifyModalView() {
    cy.expect([
      cancelInvoiceConfirmationModal.has({
        header: 'Update order status',
      }),
      cancelInvoiceConfirmationModal.has({
        message: including(message),
      }),
      paymentStatusesRadioButtons[INVOICE_POL_PAYMENT_STATUSES.NO_CHANGE_UI]().has({
        checked: true,
      }),
      ...paymentStatusesRadioButtonsOptions
        .filter(
          (button) => button !== paymentStatusesRadioButtons[INVOICE_POL_PAYMENT_STATUSES.NO_CHANGE_UI],
        )
        .map((button) => button().has({ disabled: false, visible: true, checked: false })),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },

  selectPaymentStatus(paymentStatus) {
    cy.do(paymentStatusesRadioButtons[paymentStatus]().click());
    cy.expect(paymentStatusesRadioButtons[paymentStatus]().has({ checked: true }));
  },

  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(cancelInvoiceConfirmationModal.absent());
  },

  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(cancelInvoiceConfirmationModal.absent());
  },
};
