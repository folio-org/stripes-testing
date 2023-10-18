import { Button, Modal } from '../../../../../../interactors';

const confirmDeleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });

export default {
  confirmDelete: () => cy.do(confirmDeleteModal.find(Button('Delete')).click()),
  cancelDelete: () => cy.do(confirmDeleteModal.find(Button('Cancel')).click()),
  verifyDeleteMessage: (text) => cy.expect(confirmDeleteModal.has({ message: `The note type ${text} will be deleted.` })),
};
