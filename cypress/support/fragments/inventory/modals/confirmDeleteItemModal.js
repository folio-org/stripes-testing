import { Button, Modal } from '../../../../../interactors';

const confirmDeleteItemModal = Modal({ id: 'confirmDeleteItemModal' });
const cancelButton = confirmDeleteItemModal.find(Button('Cancel'));
const deleteButton = confirmDeleteItemModal.find(Button('Delete'));

export default {
  waitLoading() {
    cy.expect(confirmDeleteItemModal.exists());
  },

  isNotDisplayed() {
    cy.expect(confirmDeleteItemModal.absent());
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  clickDeleteButton() {
    cy.expect(deleteButton.has({ disabled: false }));
    cy.do(deleteButton.click());
  },
};
