import { HTML, including } from '@interactors/html';
import { Button, Modal, MultiColumnListRow, MultiColumnListCell } from '../../../../interactors';

const checkOutNotesModal = Modal('Check out notes');
const checkOutModal = Modal('Confirm check out');
const confirmButton = Button('Confirm');
const closeButton = Button('Cancel');

export default {
  verifyModalTitle: () => {
    cy.expect(checkOutModal.exists());
  },
  closeModal: () => {
    cy.do(checkOutModal.find(closeButton).click());
  },
  verifyModalIsClosed: () => {
    cy.expect(checkOutModal.absent());
  },
  confirmModal: () => {
    cy.do(checkOutModal.find(confirmButton).click());
  },
  verifyNotesInfo: (notes, notesModal = false) => {
    notes.forEach((note, index) => {
      if (notesModal) {
        cy.expect([
          checkOutNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
          checkOutNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Date' }))
            .has({ content: including(note.date) }),
          checkOutNotesModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Source' }))
            .has({ content: including(note.source) }),
        ]);
      } else {
        cy.expect([
          checkOutModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Note' }))
            .has({ content: including(note.title) }),
          checkOutModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Date' }))
            .has({ content: including(note.date) }),
          checkOutModal
            .find(MultiColumnListRow({ index }))
            .find(MultiColumnListCell({ column: 'Source' }))
            .has({ content: including(note.source) }),
        ]);
      }
    });
  },
  verifyModalMessage: (message) => {
    cy.expect(checkOutModal.find(HTML(including(message))).exists());
  },
};
