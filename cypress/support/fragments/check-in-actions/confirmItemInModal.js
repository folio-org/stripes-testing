import { Button, Modal, Checkbox } from '../../../../interactors';

const inTransitModal = Modal('In transit');
const awaitingPickupModal = Modal('Awaiting pickup for a request');
const closeButton = Button('Close');
const printSlipCheckbox = Checkbox('Print slip');

export default {
  confirmMissingModal: () => {
    cy.do(Modal('Check in missing item?').find(Button('Confirm')).click());
  },

  confirmInTransitModal: () => {
    cy.do(inTransitModal.find(printSlipCheckbox).click());
    cy.do(inTransitModal.find(closeButton).click());
  },

  confirmAvaitingPickUpModal: () => {
    cy.do(awaitingPickupModal.find(printSlipCheckbox).click());
    cy.do(awaitingPickupModal.find(closeButton).click());
  },

  confirmAvaitingPickupCheckInModal: () => {
    cy.do(Modal('Items awaiting pickup').find(closeButton).click());
  },

  confirmMultipieceCheckInModal: () => {
    cy.do(Modal('Confirm multipiece check in').find(Button('Check in')).click());
  },
};
