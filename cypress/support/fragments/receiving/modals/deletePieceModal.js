import { Button, Modal, matching } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import ReceivingStates from '../receivingStates';

const deletePieceModal = Modal({ id: 'delete-piece-confirmation' });
const confirmButton = Button('Confirm');

const cancelButton = deletePieceModal.find(Button('Cancel'));
const deleteHoldingsButton = deletePieceModal.find(Button('Delete Holdings and Item'));
const deleteItemButton = deletePieceModal.find(Button('Delete item'));

const content =
  'This piece is connected to records in inventory. There are no other items connected to the related Holdings record. After deleting this piece would you like FOLIO to delete the Holdings?';

export default {
  waitLoading() {
    cy.expect(deletePieceModal.exists());
  },
  verifyModalView(lsLastPiece = true) {
    if (lsLastPiece) {
      cy.expect([
        deletePieceModal.has({ header: 'Delete piece' }),
        deletePieceModal.has({ message: content }),
        cancelButton.has({ disabled: false, visible: true }),
        deleteHoldingsButton.has({ disabled: false, visible: true }),
        deleteItemButton.has({ disabled: false, visible: true }),
      ]);
    } else {
      cy.expect([
        deletePieceModal.has({ header: 'Delete piece' }),
        deletePieceModal.has({ message: 'Are you sure you want to delete piece?' }),
        cancelButton.has({ disabled: false, visible: true }),
        confirmButton.has({ disabled: false, visible: true }),
      ]);
    }
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(deletePieceModal.absent());
  },
  clickDeleteHoldingsButton({ pieceDeleted = true } = {}) {
    this.clickDeleteButton({ button: deleteHoldingsButton, pieceDeleted });
  },
  clickDeleteItemButton({ pieceDeleted = true } = {}) {
    this.clickDeleteButton({ button: deleteItemButton, pieceDeleted });
  },
  clickConfirmButton({ pieceDeleted = true } = {}) {
    cy.expect(confirmButton.has({ disabled: false }));
    cy.do(confirmButton.click());

    if (pieceDeleted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(ReceivingStates.pieceDeletedSuccessfully)),
      );
    }
  },
  confirmDelete({ pieceDeleted = true } = {}) {
    cy.then(() => deletePieceModal.text()).then((modalText) => {
      if (modalText.includes('This piece is connected to records in inventory')) {
        this.clickDeleteItemButton({ pieceDeleted });
      } else {
        this.clickConfirmButton({ pieceDeleted });
      }
    });
  },
  clickDeleteButton({ button, pieceDeleted }) {
    cy.expect(button.has({ disabled: false }));
    cy.do(button.click());

    if (pieceDeleted) {
      cy.expect(deletePieceModal.absent());
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(ReceivingStates.pieceDeletedSuccessfully)),
      );
    }
  },
};
