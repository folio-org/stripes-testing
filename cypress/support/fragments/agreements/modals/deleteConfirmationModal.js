import { Button, Modal } from '../../../../../interactors';

const deleteConfirmationModal = Modal('Delete agreement line');
const deleteButton = Button('Delete');
const cancelButton = Button('Cancel');

export default {
  waitLoading: () => {
    cy.expect(deleteConfirmationModal.exists());
  },

  confirmDeleteAgreementLine: () => {
    cy.do(deleteConfirmationModal.find(deleteButton).click());
  },
};
