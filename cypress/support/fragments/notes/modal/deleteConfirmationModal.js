import { Button, Modal } from '../../../../../interactors';

const deleteConfirmationModal = Modal('Delete note');
const deleteButton = Button('Delete');
const cancelButton = Button('Cancel');

export default {
  waitLoading: () => {
    cy.expect(deleteConfirmationModal.exists());
  },

  confirmDeleteNote: () => {
    cy.do(deleteConfirmationModal.find(deleteButton).click());
  },
};
