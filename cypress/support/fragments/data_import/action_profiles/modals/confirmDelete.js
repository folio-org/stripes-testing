import { Button, Modal } from '../../../../../../interactors';

const confirmDeleteModal = Modal({ id: 'delete-action-profile-modal' });

export default {
  confirmDeleteActionProfile: () => cy.do(confirmDeleteModal.find(Button('Delete')).click()),
  cancelDeleteActionProfile: () => cy.do(confirmDeleteModal.find(Button('Cancel')).click()),
};
