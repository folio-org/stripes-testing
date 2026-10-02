export default {
  itemSavedSuccessfully: 'The title (?:\\S+) has been successfully added for (?:\\S+)',
  receiveSavedSuccessfully: 'Receiving successful',
  pieceReceivedSuccessfully: 'The piece  was successfully received',
  pieceDeletedSuccessfully: 'The piece  was successfully deleted',
  pieceSavedSuccessfully: 'The piece was successfully saved',
  exportJobStartedSuccessfully: 'Export has been started successfully',
  expectSavedSuccessfully: 'Pieces expect successful',

  // errors
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
