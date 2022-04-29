import { Button, Modal, Checkbox } from '../../../../interactors';

const inTransitModal = Modal('In transit');
const awaitingPickupModal = Modal('Awaiting pickup for a request');

export default {
  confirmMissingModal:() => {
    cy.do(Modal('Check in missing item?').find(Button('Confirm')).click());
  },

  confirmInTransitModal:() => {
    cy.do(inTransitModal.find(Checkbox('Print slip')).click());
    cy.do(inTransitModal.find(Button('Close')).click());
  },

  confirmAvaitingPicupModal:() => {
    cy.do(awaitingPickupModal.find(Checkbox('Print slip')).click());
    cy.do(awaitingPickupModal.find(Button('Close')).click());
  },

  confirmAvaitingPicupCheckInModal:() => {
    cy.do(Modal('Items awaiting pickup').find(Button('Close')).click());
  },

  confirmMultipieceItemModal:() => {
    cy.do(Modal('Confirm multipiece check in').find(Button('Check in')).click());
  },
};
