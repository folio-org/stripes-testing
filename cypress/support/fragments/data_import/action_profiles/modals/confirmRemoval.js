import { Button, Modal } from '../../../../../../interactors';

const confirmButton = Button('Confirm');
const confirmEditModal = Modal({ id:'confirm-edit-action-profile-modal' });

export default {
  confirmRemovefieldMappingProfile:() => cy.do(confirmEditModal.find(confirmButton).click()),
  canselRemoveFieldMappingProfile:() => cy.do(confirmEditModal.find(confirmButton).click())
};

