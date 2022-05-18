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
const numberOfPieces = KeyValue('Number of pieces');
const descriptionOfPieces = KeyValue('Description of pieces');
const numberOfMissingPieces = KeyValue('Number of missing pieces');
const descriptionOfMissingPieces = KeyValue('Description of missing pieces');

export default {
  confirmMultiplePiecesItemModal:() => {
    cy.do(confirmModal.find(checkOutButton).click());
    cy.expect(MultiColumnListRow().exists());
  },

  checkNumberOfPiecesInModal:(itemPieces) => {
    cy.expect(confirmModal.find(numberOfPieces).exists());
    cy.expect(numberOfPieces.has({ value: itemPieces }));
  },

  checkDescriptionOfPiecesInModal:(description) => {
    cy.expect(confirmModal.find(descriptionOfPieces).exists());
    cy.expect(descriptionOfPieces.has({ value: description }));
  },

  checkIsButtonPresented:() => {
    cy.expect(confirmModal.find(cancelButton).exists());
    cy.expect(confirmModal.find(checkOutButton).exists());
  },

  checkIsModalConsistOf(itemTitle, itemPieces, description) {
    cy.expect(confirmModal.find(HTML(including(itemTitle))).exists());
    this.checkNumberOfPiecesInModal(itemPieces);
    this.checkDescriptionOfPiecesInModal(description);
    this.checkIsButtonPresented();
  },

  checkMissingPiecesInModal:(itemPieces, description) => {
    cy.expect(confirmModal.find(numberOfMissingPieces).exists());
    cy.expect(numberOfMissingPieces.has({ value: itemPieces }));
    cy.expect(confirmModal.find(descriptionOfMissingPieces).exists());
    cy.expect(descriptionOfMissingPieces.has({ value: description }));
  },

  checkNumberOfMissingPieces:() => {
    cy.expect(confirmModal.find(numberOfMissingPieces).absent());
  },

  checkDescriptionOfMissingPieces:() => {
    cy.expect(confirmModal.find(numberOfMissingPieces).absent());
  },

  checkIsNotModalConsistOf() {
    this.checkNumberOfMissingPieces();
    this.checkDescriptionOfMissingPieces();
  },

  cancelModal:() => {
    cy.do(confirmModal.find(cancelButton).click());
  },
};
