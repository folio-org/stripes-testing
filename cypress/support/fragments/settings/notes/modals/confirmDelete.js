import { Button, Modal } from '../../../../../../interactors';

const confirmDeleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const deleteButton = confirmDeleteModal.find(Button('Delete'));
const cancelButton = confirmDeleteModal.find(Button('Cancel'));

export default {
  confirmDelete: () => cy.do(deleteButton.click()),
  verifyDeleteButtonDisplayed: () => cy.expect(deleteButton.exists()),
  verifyCancelButtonDisplayed: () => cy.expect(cancelButton.exists()),
  cancelDelete: () => cy.do(cancelButton.click()),
  verifyDeleteMessage: (text) => cy.expect(confirmDeleteModal.has({ message: `The note type ${text} will be deleted.` })),
};
