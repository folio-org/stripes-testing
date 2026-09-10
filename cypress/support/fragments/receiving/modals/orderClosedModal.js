import { Modal, Button, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

const orderClosedModal = Modal({ id: 'confirm-receiving' });
const modalMessage =
  'The order linked to this Title is closed. Are you sure you want to receive this piece(s)?';

const orderClosedModalButtons = {
  [COMMON_BUTTON_LABELS.CANCEL]: () => orderClosedModal.find(Button('Cancel')),
  [COMMON_BUTTON_LABELS.CONTINUE]: () => orderClosedModal.find(Button('Continue')),
};

export default {
  handleOrderClosedModal({ action }) {
    cy.expect(orderClosedModal.has({ header: 'Order closed' }));
    cy.expect(orderClosedModal.has({ message: including(modalMessage) }));

    Object.values(orderClosedModalButtons).forEach((button) => {
      cy.expect(button().has({ visible: true, disabled: false }));
    });

    cy.do(orderClosedModalButtons[action]().click());
    cy.expect(orderClosedModal.absent());
  },
};
