export default {
  itemSavedSuccessfully: 'The title (?:\\S+) has been successfully added for (?:\\S+)',
  receiveSavedSuccessfully: 'Receiving successful',
  pieceReceivedSuccessfully: 'The piece  was successfully received',
  pieceDeletedSuccessfully: 'The piece  was successfully deleted',
  pieceSavedSuccessfully: 'The piece was successfully saved',
  exportJobStartedSuccessfully: 'Export has been started successfully',
  expectSavedSuccessfully: 'Pieces expect successful',
  pieceUnreceivedSuccessfully: 'Unreceiving successful',
  pieceSequenceChanged(from, to) {
    return `The sequence of the piece was successfully changed from ${from} to ${to}`;
  },

  // field validation messages
  requiredFieldError: 'Required!',
  sequenceNumberOutOfRange(maxSequenceNumber) {
    return `Please enter a number between 1 and ${maxSequenceNumber}.`;
  },
  dateMustBeLaterThanCurrentDate: 'Selected date must be later than the current date',

  // errors
  barcodeIsNotUnique: 'Barcode must be unique, piece and item data could not be updated.',
  lastSynchronizedPieceNotDeleted:
    'The piece was not deleted because you cannot delete all pieces when ordering and receiving quantity are synchronized.',

  // API errorCodes
  lastPieceErrorCode: 'lastPiece',

  // API errorMessages
  lastSynchronizedPieceDeleteError:
    "The piece cannot be deleted because it is the last piece for the poLine with Receiving Workflow 'Synchronized order and receipt quantity' and cost quantity '1'",

  // warnings
  purchaseOrderClosedWarning({ reason } = {}) {
    return `Purchase order is closed - ${reason}`;
  },
};
