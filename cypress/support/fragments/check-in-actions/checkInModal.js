import { including } from '@interactors/html';
import { Button, Modal, MultiColumnListRow, MultiColumnListCell } from '../../../../interactors';

const checkInNotesModal = Modal('Check in notes');
const checkInModal = Modal('Confirm check in');
const confirmButton = Button('Confirm');
const closeButton = Button('Cancel');

export default {
  verifyModalTitle: () => {
    cy.expect(checkInModal.exists());
  },
  closeModal: () => {
    cy.do(checkInModal.find(closeButton).click());
  },
  confirmModal: () => {
    cy.do(checkInModal.find(confirmButton).click());
  },
  checkNotes: (notes, notesModal) => {
    cy.log(notes);
    notes.forEach((note, index) => {
      if (notesModal) {
        cy.expect(
          checkInNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
        );
      } else {
        cy.expect(
          checkInModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
        );
      }
    });
  },
};
