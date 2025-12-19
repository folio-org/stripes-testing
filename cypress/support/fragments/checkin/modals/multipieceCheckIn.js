import {
  Button,
  Modal,
  KeyValue,
  including,
  HTML,
  MultiColumnList,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const confirmModal = Modal('Confirm multipiece check in');
const cancelButton = confirmModal.find(Button('Cancel'));
const checkInButton = confirmModal.find(Button('Check in'));
const numberOfPiecesKeyValue = confirmModal.find(KeyValue('Number of pieces'));
const descriptionOfPiecesKeyValue = confirmModal.find(KeyValue('Description of pieces'));
const numberOfMissingPiecesKeyValue = confirmModal.find(KeyValue('Number of missing pieces'));
const descriptionOfMissingPiecesKeyValue = confirmModal.find(
  KeyValue('Description of missing pieces'),
);

const getItemProps = (numberOfPieces, hasDescription, hasMissingPieces, materialTypeName) => {
  const defaultDescription = `autotest_description_${getRandomPostfix()}`;
  const props = { materialTypeName };
  if (numberOfPieces) {
    props.numberOfPieces = numberOfPieces;
  }
  if (hasDescription) {
    props.descriptionOfPieces = defaultDescription;
  }
  if (hasMissingPieces) {
    props.numberOfMissingPieces = 2;
    props.missingPieces = defaultDescription;
  }
  return props;
};

export default {
  getItemProps,
  checkContent({
    barcodes: [barcode],
    instanceTitle,
    properties: {
      materialTypeName,
      numberOfPieces = 'No value set-',
      descriptionOfPieces = '-',
      numberOfMissingPieces = '-',
      missingPieces = '-',
    },
  }) {
    cy.expect(
      confirmModal
        .find(
          HTML(
            including(
              `${instanceTitle} (${materialTypeName}) (Barcode: ${barcode}) will be checked in.`,
            ),
          ),
        )
        .exists(),
    );
    if (numberOfPieces === 'No value set-' && descriptionOfPieces === '-') {
      cy.expect(numberOfPiecesKeyValue.has({ value: 'No value set-' }));
      cy.expect(descriptionOfPiecesKeyValue.has({ value: 'No value set-' }));
    } else {
      cy.expect(numberOfPiecesKeyValue.has({ value: numberOfPieces.toString() }));
      cy.expect(descriptionOfPiecesKeyValue.has({ value: descriptionOfPieces }));
    }
    if (numberOfMissingPieces === '-' && missingPieces === '-') {
      cy.expect(numberOfMissingPiecesKeyValue.absent());
      cy.expect(descriptionOfMissingPiecesKeyValue.absent());
    } else {
      cy.expect(numberOfMissingPiecesKeyValue.has({ value: numberOfMissingPieces.toString() }));
      cy.expect(descriptionOfMissingPiecesKeyValue.has({ value: missingPieces }));
    }
    cy.expect(checkInButton.exists());
    cy.expect(cancelButton.exists());
  },

  verifyMultipieceCheckInModalIsAbsent() {
    cy.expect(confirmModal.absent());
  },

  verifyMultipieceCheckInModalIsDisplayed() {
    cy.expect(confirmModal.exists());
  },

  cancelMultipieceCheckInModal(barcode) {
    cy.do(cancelButton.click());
    cy.expect([
      confirmModal.absent(),
      MultiColumnList({ id: 'list-items-checked-in' })
        .find(HTML(including(barcode)))
        .absent(),
    ]);
  },
};
