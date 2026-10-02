import { Button, Modal, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

const updateExpenseClassModal = Modal(including('Update expense class'));
const confirmButton = updateExpenseClassModal.find(Button(COMMON_BUTTON_LABELS.CONFIRM));

export const UPDATE_EXPENSE_CLASS_MODAL_MESSAGE =
  'Changing this expense class will not update the related invoice line fund distribution. If you want the expense class on the invoice line to match you must update the related invoice line fund distribution in the invoice application.';

export default {
  verifyModalView() {
    cy.expect([
      updateExpenseClassModal.has({ content: including(UPDATE_EXPENSE_CLASS_MODAL_MESSAGE) }),
      confirmButton.has({ disabled: false }),
    ]);
  },
  clickConfirmButton() {
    cy.do(confirmButton.click());
    cy.expect(updateExpenseClassModal.absent());
  },
};
