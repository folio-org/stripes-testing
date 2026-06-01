import { Button, Modal, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

const unopenConfirmationModal = Modal(including('Unopen - purchase order'));
const cancelButton = unopenConfirmationModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const submitButton = unopenConfirmationModal.find(Button(COMMON_BUTTON_LABELS.SUBMIT));
const deleteHoldingsButton = unopenConfirmationModal.find(
  Button({ id: 'clickable-order-unopen-confirmation-confirm-delete-holdings' }),
);
const keepHoldingsButton = unopenConfirmationModal.find(
  Button({ id: 'clickable-order-unopen-confirmation-confirm-keep-holdings' }),
);

export const DEFAULT_MODAL_MESSAGE = 'Are you sure you want to unopen the order?';

const values = {
  [true]: {
    content:
      'This order has at least one order line with related Holdings record(s) that do not reference any pieces or items. Holdings with no other related items can be deleted from inventory if desired. How would you like to proceed?',
    deleteHoldingsValue: 'Delete Holdings',
    keepHoldingsValue: 'Keep Holdings',
  },
  [false]: {
    content:
      'This order has at least one order line with receiving workflow "Synchronized order and receipt quantity". Such POLs with related receiving records will have any unreceived pieces, with no current requests pending, deleted, and any "On order" Item records related to those pieces will also be deleted from inventory. Holdings linked to those items that have no other related items can also be deleted from inventory. How would you like to proceed?',
    deleteHoldingsValue: 'Delete Holdings and items',
    keepHoldingsValue: 'Delete items',
  },
};

export default {
  confirm({ submit = false, keepHoldings = false } = {}) {
    if (submit) {
      cy.do(submitButton.click());
      return;
    }

    if (keepHoldings) {
      cy.do(keepHoldingsButton.click());
    } else {
      cy.do(deleteHoldingsButton.click());
    }
    cy.expect(unopenConfirmationModal.absent());
  },
  verifyModalView({ orderNumber, checkinItems, hasRelations = true }) {
    const resolveExpectedMessage = () => {
      const content = hasRelations ? values[checkinItems].content : DEFAULT_MODAL_MESSAGE;

      return including(content);
    };

    cy.expect([
      unopenConfirmationModal.has({
        header: including(`Unopen - purchase order - ${orderNumber}`),
      }),
      unopenConfirmationModal.has({ message: resolveExpectedMessage() }),
      cancelButton.has({ disabled: false, visible: true }),
    ]);

    if (hasRelations) {
      cy.expect([
        deleteHoldingsButton.has({
          disabled: false,
          visible: true,
          text: values[checkinItems].deleteHoldingsValue,
        }),
        keepHoldingsButton.has({
          disabled: false,
          visible: true,
          text: values[checkinItems].keepHoldingsValue,
        }),
      ]);
    } else {
      cy.expect(submitButton.has({ disabled: false, visible: true }));
    }
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(unopenConfirmationModal.absent());
  },
};
