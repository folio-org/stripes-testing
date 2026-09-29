import { Button, Modal, MultiColumnListCell, including } from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

const possibleDuplicateOrderLineModal = Modal('Save order line');
const cancelButton = possibleDuplicateOrderLineModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const submitButton = possibleDuplicateOrderLineModal.find(Button(COMMON_BUTTON_LABELS.SUBMIT));

const MODAL_MESSAGES = {
  DUPLICATE_ORDER_LINE: 'This appears to be a duplicate order line',
  POSSIBLE_DUPLICATE_ORDER_LINE: 'Possible duplicate order line',
};

export default {
  verifyModalView({ poLineNumber } = {}) {
    cy.expect([
      possibleDuplicateOrderLineModal.exists(),
      possibleDuplicateOrderLineModal.has({
        message: including(MODAL_MESSAGES.DUPLICATE_ORDER_LINE),
      }),
      possibleDuplicateOrderLineModal.has({
        message: including(MODAL_MESSAGES.POSSIBLE_DUPLICATE_ORDER_LINE),
      }),
      cancelButton.has({ disabled: false }),
      submitButton.has({ disabled: false }),
    ]);

    if (poLineNumber) {
      cy.expect(
        possibleDuplicateOrderLineModal
          .find(MultiColumnListCell({ column: 'POL number', content: poLineNumber }))
          .exists(),
      );
    }
  },
  clickSubmitButton() {
    cy.do(submitButton.click());
    cy.expect(possibleDuplicateOrderLineModal.absent());
  },
};
