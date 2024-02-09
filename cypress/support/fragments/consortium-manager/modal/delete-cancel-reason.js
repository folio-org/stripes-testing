import { including } from 'bigtest';
import { Button, Modal } from '../../../../../interactors';

const deleteCancelReasonModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const cancelButton = deleteCancelReasonModal.find(Button('Cancel'));
const deleteButton = deleteCancelReasonModal.find(Button('Delete'));

export default {
  waitLoadingDeleteCancelReason(name) {
    cy.expect([
      deleteCancelReasonModal.has({
        header: 'Delete cancel reason',
        content: including(`The cancel reason ${name} will be deleted.`),
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
