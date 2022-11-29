import { Button, Modal } from '../../../../../../interactors';

const confirmButton = Button('Confirm');
const confirmEditModal = Modal({ id:'confirm-edit-action-profile-modal' });
const canselButton = Button('Cancel');

export default {
  canselRemoveFieldMappingProfile:() => cy.do(confirmEditModal.find(canselButton).click()),
  confirmRemovefieldMappingProfile:() => cy.do(confirmEditModal.find(confirmButton).click())
};

