import { Button, Modal, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

const updateReceivingWorkflowModal = Modal(including('Update receiving workflow'));
const cancelButton = updateReceivingWorkflowModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const confirmButton = updateReceivingWorkflowModal.find(Button(COMMON_BUTTON_LABELS.CONFIRM));

export const UPDATE_RECEIVING_WORKFLOW_MESSAGE =
  'You are about to change the receiving workflow to “Independent order and receipt quantity”. This change cannot be undone unless the order is unopened. Are you sure you want to continue?';

export default {
  verifyModalView({ message = UPDATE_RECEIVING_WORKFLOW_MESSAGE } = {}) {
    cy.expect([
      updateReceivingWorkflowModal.has({ header: including('Update receiving workflow') }),
      updateReceivingWorkflowModal.has({ message: including(message) }),
      cancelButton.has({ disabled: false, visible: true }),
      confirmButton.has({ disabled: false, visible: true }),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(updateReceivingWorkflowModal.absent());
  },
  clickConfirmButton() {
    cy.do(confirmButton.click());
    cy.expect(updateReceivingWorkflowModal.absent());
  },
};
