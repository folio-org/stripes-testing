import { Button, Modal, including } from '../../../../../../interactors';

const deleteConfirmationModal = Modal({ title: including('Remove ') });
const deletelButton = Button('Delete');
const cancelButton = Button('Cancel');

export default {
  verifyModalView(configurationName) {
    cy.expect([
      deleteConfirmationModal.has({
        content: including('Are you sure you want to delete the remote storage configuration?'),
      }),
      deleteConfirmationModal.has({
        title: `Remove ${configurationName}`,
      }),
      deleteConfirmationModal.find(deletelButton).exists(),
      deleteConfirmationModal.find(cancelButton).exists(),
    ]);
  },

  cancelModal() {
    cy.do(deleteConfirmationModal.find(cancelButton).click());
    cy.expect(deleteConfirmationModal.absent());
  },

  confirm() {
    cy.do(deleteConfirmationModal.find(deletelButton).click());
  },
};
