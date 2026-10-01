import { Button, Modal, including } from '../../../../../interactors';

const receivingNoteModal = Modal('Receiving note');
const continueButton = receivingNoteModal.find(Button('Continue'));

export default {
  verifyModalView(note) {
    cy.expect([
      receivingNoteModal.exists(),
      continueButton.has({ disabled: false, visible: true }),
    ]);

    if (note) {
      cy.expect(receivingNoteModal.has({ message: including(note) }));
    }
  },
  clickContinueButton() {
    cy.do(continueButton.click());
    cy.expect(receivingNoteModal.absent());
  },
};
