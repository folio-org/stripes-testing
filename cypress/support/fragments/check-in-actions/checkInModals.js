import { Button, Modal, Checkbox } from '../../../../interactors';

const inTransitModal = Modal('In transit');
const awaitingPickupModal = Modal('Awaiting pickup for a request');
const closeButton = Button('Close');
const printSlipCheckbox = Checkbox('Print slip');

export default {
  confirmMissing:() => {
    cy.do(Modal('Check in missing item?').find(Button('Confirm')).click());
  },

  confirmInTransit:() => {
    cy.do(inTransitModal.find(printSlipCheckbox).click());
    cy.do(inTransitModal.find(closeButton).click());
  },

  confirmAvaitingPickUp:() => {
    cy.do(awaitingPickupModal.find(printSlipCheckbox).click());
    cy.do(awaitingPickupModal.find(closeButton).click());
  },

  confirmAvaitingPickupCheckIn:() => {
    cy.do(Modal('Items awaiting pickup').find(closeButton).click());
  },

  confirmMultipieceCheckIn:() => {
    cy.do(Modal('Confirm multipiece check in').find(Button('Check in')).click());
  }
};
