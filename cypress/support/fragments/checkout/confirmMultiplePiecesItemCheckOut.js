import {
  Button,
  Modal,
  MultiColumnListRow,
  KeyValue,
  including,
  HTML
} from '../../../../interactors';

const confirmModal = Modal('Confirm multipiece check out');
const checkOutButton = Button('Check out');
const cancelButton = Button('Cancel');

export default {
  confirmMultiplePiecesItemModal:() => {
    cy.do(confirmModal.find(checkOutButton).click());
    cy.expect(MultiColumnListRow().exists());
  },

  checkIsModalConsistOf:(itemTitle, itemPieces, description) => {
    const numberOfPieces = KeyValue('Number of pieces');
    const descriptionOfPieces = KeyValue('Description of pieces');

    cy.expect(confirmModal.find(HTML(including(itemTitle))).exists());
    cy.expect(confirmModal.find(numberOfPieces).exists());
    cy.expect(numberOfPieces.has({ value: itemPieces }));
    cy.expect(confirmModal.find(descriptionOfPieces).exists());
    cy.expect(descriptionOfPieces.has({ value: description }));
    cy.expect(confirmModal.find(cancelButton).exists());
    cy.expect(confirmModal.find(checkOutButton).exists());
  },

  cancelModal:() => {
    cy.do(confirmModal.find(cancelButton).click());
    cy.expect(MultiColumnListRow().exists());
  },
};
