import {
  Button,
  Modal,
  MultiColumnList,
  KeyValue,
  including,
  HTML,
} from '../../../../../interactors';

const confirmModal = Modal('Confirm multipiece check out');
const checkOutButton = confirmModal.find(Button('Check out'));
const cancelButton = confirmModal.find(Button('Cancel'));
const numberOfPieces = confirmModal.find(KeyValue('Number of pieces'));
const descriptionOfPieces = confirmModal.find(KeyValue('Description of pieces'));
const numberOfMissingPiecesKeyValue = confirmModal.find(KeyValue('Number of missing pieces'));
const descriptionOfMissingPiecesKeyValue = confirmModal.find(
  KeyValue('Description of missing pieces'),
);

export default {
  confirmMultipleCheckOut: (barcode) => {
    cy.do(checkOutButton.click());
    cy.expect(
      MultiColumnList({ id: 'list-items-checked-out' })
        .find(HTML(including(barcode)))
        .exists(),
    );
  },

  checkContent: (
    itemTitle,
    materialType,
    barcode,
    { itemPieces = '-', description = 'No value set-' },
    { missingitemPieces: missingItemPieces = '-', missingDescription = '-' },
  ) => {
    cy.expect(
      confirmModal
        .find(
          HTML(
            including(`${itemTitle} (${materialType}) (Barcode: ${barcode}) will be checked out.`),
          ),
        )
        .exists(),
    );
    if (description === 'No value set-' && itemPieces === '-') {
      cy.expect(numberOfPieces.absent());
      cy.expect(descriptionOfPieces.absent());
    } else {
      cy.expect(numberOfPieces.has({ value: itemPieces.toString() }));
      cy.expect(descriptionOfPieces.has({ value: description }));
    }
    if (missingItemPieces === missingDescription && missingItemPieces === '-') {
      cy.expect(numberOfMissingPiecesKeyValue.absent());
      cy.expect(descriptionOfMissingPiecesKeyValue.absent());
    } else {
      cy.expect(numberOfMissingPiecesKeyValue.has({ value: missingItemPieces.toString() }));
      cy.expect(descriptionOfMissingPiecesKeyValue.has({ value: missingDescription }));
    }
    cy.expect(checkOutButton.exists());
    cy.expect(cancelButton.exists());
  },

  cancelModal: () => {
    cy.do(cancelButton.click());
  },
};
