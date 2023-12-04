import { Button, Modal } from '../../../../../interactors';

const newOrderModal = Modal({ id: 'create-order-from-instance-modal' });
const cancelButton = Button('Cancel');

export default {
  waitLoading: () => {
    cy.expect(newOrderModal.exists());
  },

  isNotDisplayed: () => {
    cy.expect(newOrderModal.absent());
  },

  clickCancel: () => {
    cy.do(newOrderModal.find(cancelButton).click());
  },
};
