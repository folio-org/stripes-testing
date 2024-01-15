import { Button, Modal, including } from '../../../../../interactors';

const unpaidInvoiceListModal = Modal({ id: 'unpaid-invoice-list-modal' });

const cancelButton = unpaidInvoiceListModal.find(Button('Cancel'));
const exportListButton = unpaidInvoiceListModal.find(Button('Export list'));
const continueButton = unpaidInvoiceListModal.find(Button('Continue'));

const message =
  'FOLIO has found invoices that are not yet paid or canceled. If you are sure you want to continue with rollover click continue.';

export default {
  verifyModalView() {
    cy.expect([
      unpaidInvoiceListModal.has({ header: 'Unpaid invoices' }),
      unpaidInvoiceListModal.has({ message: including(message) }),
      cancelButton.has({ disabled: false, visible: true }),
      exportListButton.has({ disabled: false, visible: true }),
      continueButton.has({ disabled: false, visible: true }),
    ]);
  },
  clickCancelModal() {
    cy.do(cancelButton.click());
    cy.expect(unpaidInvoiceListModal.absent());
  },
  clickContinueButton() {
    cy.do(continueButton.click());
    cy.expect(unpaidInvoiceListModal.absent());
  },
};
