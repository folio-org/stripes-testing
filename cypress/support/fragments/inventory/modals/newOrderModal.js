import { Button, Modal, TextField, HTML, including } from '../../../../../interactors';

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

  verifyTextMessageExists(text) {
    cy.expect(TextField({ name: 'poNumber' }).has({ text }));
  },

  verifyTextDescriptionExists: (description) => {
    cy.expect(newOrderModal.find(HTML(including(description))).exists());
  },
};
