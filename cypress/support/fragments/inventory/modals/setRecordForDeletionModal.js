import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const setRecordForDeletionModal = Modal({
  header: 'Are you sure you want to set this record for deletion?',
});
const cancelButton = setRecordForDeletionModal.find(Button('Cancel'));
const confirmButton = setRecordForDeletionModal.find(Button('Confirm'));

export default {
  waitLoading() {
    cy.expect(setRecordForDeletionModal.exists());
  },

  verifyModalView(instanceTitle) {
    cy.expect([
      setRecordForDeletionModal.has({
        message: including(
          `You have chosen to set ${instanceTitle} for deletion. When a record is set for deletion, the instance will be Suppressed from discovery and Staff suppressed. If the instance source is MARC, then the MARC LDR 05 will be set to "d"`,
        ),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      confirmButton.has({ disabled: false, visible: true }),
    ]);
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  clickConfirm() {
    cy.do(confirmButton.click());
  },

  isNotDisplayed() {
    cy.expect(setRecordForDeletionModal.absent());
  },
};
