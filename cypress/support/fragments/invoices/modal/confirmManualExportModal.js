import { Button, Modal, matching } from '../../../../../interactors';

const confirmManualExportModal = Modal({
  id: 'run-manual-export-confirmation',
});
const cancelButton = confirmManualExportModal.find(Button('Cancel'));
const continueButton = confirmManualExportModal.find(Button('Continue'));

const message =
  /All vouchers created since last export for the batch group (?:\S+) will be exported and this process cannot be reversed/;

export default {
  verifyModalView() {
    cy.expect([
      confirmManualExportModal.has({
        header: 'Run manual export',
      }),
      confirmManualExportModal.has({
        message: matching(message),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      continueButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(confirmManualExportModal.absent());
  },
  clickContinueButton() {
    cy.do(continueButton.click());
    cy.expect(confirmManualExportModal.absent());
  },
};
