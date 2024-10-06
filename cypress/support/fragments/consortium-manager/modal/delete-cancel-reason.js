import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const deleteCancelReasonModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const cancelButton = deleteCancelReasonModal.find(Button('Cancel'));
const deleteButton = deleteCancelReasonModal.find(Button('Delete'));

export default {
  waitLoadingDeleteModal(settingName, entityName) {
    cy.expect([
      deleteCancelReasonModal.has({
        header: `Delete ${settingName}`,
        content: including(`The ${settingName} ${entityName} will be deleted.`),
      }),
      cancelButton.is({ disabled: false }),
      deleteButton.is({ disabled: false }),
    ]);
  },

  clickCancel() {
    cy.do(cancelButton.click());
    cy.expect(deleteCancelReasonModal.absent());
  },

  clickDelete() {
    cy.do(deleteButton.click());
    cy.expect(deleteCancelReasonModal.absent());
  },
};
