import { Button, Modal } from '../../../../../interactors';

const modalTitle = 'Route for delivery request';
const routeForDeliveryModal = Modal(modalTitle);
const closeButton = Button({ icon: 'times' });

export default {
  verifyModalTitle: () => {
    cy.expect(routeForDeliveryModal.exists());
  },

  closeModal: () => {
    cy.do(routeForDeliveryModal.find(closeButton).click());
    cy.wait(500);
    cy.expect(routeForDeliveryModal.absent());
  },
};
