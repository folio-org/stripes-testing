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

  checkContent:(itemTitle, materialType, barcode, { itemPieces = '-', description = '-' }, { missingitemPieces = '-', missingDescription = '-' }) => {
    cy.expect(confirmModal.find(HTML(including(`${itemTitle} (${materialType}) (Barcode: ${barcode}) will be checked out.`))).exists());
    if (itemPieces === description && itemPieces === '-') {
      cy.expect(numberOfPieces.absent());
      cy.expect(descriptionOfPieces.absent());
    } else {
      cy.expect(numberOfPieces.has({ value: itemPieces.toString() }));
      cy.expect(descriptionOfPieces.has({ value: description }));
    }
    if (missingitemPieces === missingDescription && missingitemPieces === '-') {
      cy.expect(numberOfMissingPiecesKeyValue.absent());
      cy.expect(descriptionOfMissingPiecesKeyValue.absent());
    } else {
      cy.expect(numberOfMissingPiecesKeyValue.has({ value: missingitemPieces.toString() }));
      cy.expect(descriptionOfMissingPiecesKeyValue.has({ value: missingDescription }));
    }
    cy.expect(checkOutButton.exists());
  },

  cancelModal:() => {
    cy.do(cancelButton.click());
  },
};
