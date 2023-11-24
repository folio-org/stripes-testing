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
  verifyModalIsClosed: () => {
    cy.expect(checkInModal.absent());
  },
  confirmModal: () => {
    cy.do(checkInModal.find(confirmButton).click());
  },
  verifyNotesInfo: (notes, notesModal) => {
    cy.log(notes);
    notes.forEach((note, index) => {
      if (notesModal) {
        cy.expect([
          checkInNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
          checkInNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Date' }))
            .has({ content: including(note.date) }),
          checkInNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Source' }))
            .has({ content: including(note.source) }),
        ]);
      } else {
        cy.expect([
          checkInModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
          checkInModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Date' }))
            .has({ content: including(note.date) }),
          checkInModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Source' }))
            .has({ content: including(note.source) }),
        ]);
      }
    });
  },
};
