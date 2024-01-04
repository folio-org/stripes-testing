import { Button, Modal, including } from '../../../../../../interactors';

const exceptionModal = Modal(including('Cannot delete '));
const okayButton = exceptionModal.find(Button('Okay'));

export default {
  verifyExceptionMessage: (message) => cy.expect(
    exceptionModal.has({
      message: including(message),
    }),
  ),

  clickOkayButton: () => {
    cy.do(okayButton.click());
  },
};
