import { Button, Modal, TextField } from '../../../../../interactors';

const newOrderModal = Modal({ id: 'create-order-from-instance-modal' });
const cancelButton = Button('Cancel');
const createButton = Button('Create');

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

  clickCreateButton: () => {
    cy.do(newOrderModal.find(createButton).click());
  },

  enterOrderNumber: (orderNumber) => {
    cy.do(newOrderModal.find(TextField({ name: 'poNumber' })).fillIn(orderNumber));
  },
};
