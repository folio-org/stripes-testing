import { Button, Modal } from '../../../../../interactors';

const createInvoiceModal = Modal({ id: 'create-invoice-from-order' });
const cancelButton = createInvoiceModal.find(Button('Cancel'));
const submitButton = createInvoiceModal.find(Button('Submit'));

export default {
  verifyModalView() {
    cy.expect([
      createInvoiceModal.has({
        header: 'Create invoice',
      }),
      createInvoiceModal.has({ message: 'Do you want to create an invoice from this order?' }),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  confirm() {
    cy.do(submitButton.click());
    cy.expect(createInvoiceModal.absent());
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(createInvoiceModal.absent());
  },
};
