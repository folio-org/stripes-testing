import { Button, Modal, MultiColumnListRow, KeyValue, including, HTML } from '../../../../interactors';

const confirmModal = Modal('Confirm multipiece check out');
const checkOutButton = confirmModal.find(Button('Check out'));
const cancelButton = confirmModal.find(Button('Cancel'));
const numberOfPieces = confirmModal.find(KeyValue('Number of pieces'));
const descriptionOfPieces = confirmModal.find(KeyValue('Description of pieces'));
const numberOfMissingPiecesKeyValue = confirmModal.find(KeyValue('Number of missing pieces'));
const descriptionOfMissingPiecesKeyValue = confirmModal.find(KeyValue('Description of missing pieces'));

export default {
  confirmMultipleCheckOut:() => {
    cy.do(checkOutButton.click());
    cy.expect(MultiColumnListRow().exists());
  },

  checkContent:(itemTitle, materialType, barcode, itemPieces = '-', description = '-', { missingPiecesProperties }) => {
    cy.expect(confirmModal.find(HTML(including(`${itemTitle} (${materialType}) (Barcode: ${barcode}) will be checked out.`))).exists());
    cy.expect(numberOfPieces.has({ value: itemPieces }));
    cy.expect(descriptionOfPieces.has({ value: description }));
    if (missingPiecesProperties) {
      cy.expect(numberOfMissingPiecesKeyValue.has({ value: { missingPiecesProperties } }));
      cy.expect(descriptionOfMissingPiecesKeyValue.has({ value: { missingPiecesProperties } }));
    } else {
      cy.expect(numberOfMissingPiecesKeyValue.absent());
      cy.expect(descriptionOfMissingPiecesKeyValue.absent());
    }
    cy.expect(checkOutButton.exists());
  },

  cancelModal:() => {
    cy.do(cancelButton.click());
  },
};
