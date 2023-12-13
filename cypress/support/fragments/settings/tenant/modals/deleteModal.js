import { Button, Modal, including } from '../../../../../../interactors';

const deleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const cancelButton = deleteModal.find(Button('Cancel'));
const deleteButton = deleteModal.find(Button('Delete'));

export default {
  cancel: () => {
    cy.do(cancelButton.click());
    cy.expect(deleteModal.absent());
  },

  confirm: () => {
    cy.do(deleteButton.click());
  },

  verifyModalView(message) {
    cy.expect(deleteModal.exists());
    cy.expect(
      deleteModal.has({
        content: including(message),
      }),
    );
    cy.expect(deleteButton.exists());
    cy.expect(cancelButton.exists());
  },
};
