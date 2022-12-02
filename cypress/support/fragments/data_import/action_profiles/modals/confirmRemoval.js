import { Button, Modal } from '../../../../../../interactors';

const confirmEditModal = Modal({ id:'confirm-edit-action-profile-modal' });
const canselButton = Button('Cancel');

export default {
  confirmRemovefieldMappingProfile:() => cy.do(confirmEditModal.find(Button('Confirm')).click()),
  cancelRemoveFieldMappingProfile:() => cy.do(confirmEditModal.find(Button('Cancel')).click())
};
