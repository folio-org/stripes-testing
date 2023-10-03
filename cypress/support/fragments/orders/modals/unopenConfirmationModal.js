import { Button, Modal, including } from '../../../../../interactors';

const unopenConfirmationModal = Modal(including('Unopen - purchase order'));
const cancelButton = unopenConfirmationModal.find(Button('Cancel'));
const deleteHoldingsButton = unopenConfirmationModal.find(
  Button({ id: 'clickable-order-unopen-confirmation-confirm-delete-holdings' }),
);
const keepHoldingsButton = unopenConfirmationModal.find(
  Button({ id: 'clickable-order-unopen-confirmation-confirm-keep-holdings' }),
);
const content =
  'This order has at least one order line with related Holdings record(s) that do not reference any pieces or items. Holdings with no other related items can be deleted from inventory if desired. How would you like to proceed?';

export default {
  confirm({ keepHoldings = false } = {}) {
    if (keepHoldings) {
      cy.do(keepHoldingsButton.click());
    } else {
      cy.do(deleteHoldingsButton.click());
    }
    cy.expect(unopenConfirmationModal.absent());
  },
  verifyModalView(poNumber) {
    cy.expect([
      unopenConfirmationModal.has({ header: including(`Unopen - purchase order - ${poNumber}`) }),
      unopenConfirmationModal.has({ message: including(content) }),
      cancelButton.has({ disabled: false, visible: true }),
      deleteHoldingsButton.has({ disabled: false, visible: true }),
      keepHoldingsButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(unopenConfirmationModal.absent());
  },
};
