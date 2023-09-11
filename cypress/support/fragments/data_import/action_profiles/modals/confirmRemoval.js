import { Button, Modal } from '../../../../../../interactors';

const confirmEditModal = Modal({ id: 'confirm-edit-action-profile-modal' });

export default {
  confirmRemovefieldMappingProfile: () => cy.do(confirmEditModal.find(Button('Confirm')).click()),
  cancelRemoveFieldMappingProfile: () => cy.do(confirmEditModal.find(Button('Cancel')).click()),
};
