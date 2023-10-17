import { Button, Modal } from '../../../../../../interactors';

const confirmDeleteModal = Modal({ id: 'delete-match-profile-modal' });

export default {
  delete: () => cy.do(confirmDeleteModal.find(Button('Delete')).click()),
  cancel: () => cy.do(confirmDeleteModal.find(Button('Cancel')).click()),
};
