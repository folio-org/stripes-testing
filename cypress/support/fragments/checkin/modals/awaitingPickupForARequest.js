import { Button, Modal, Checkbox, including } from '../../../../../interactors';

const modalTitle = 'Awaiting pickup for a request';
const modalCheckbox = Modal(modalTitle).find(Checkbox('Print slip'));

export default {
  verifyModalTitle: () => {
    cy.expect(Modal(modalTitle).exists());
  },
  closeModal: () => {
    cy.do(Button('Close').click());
    cy.wait(500);
  },
  closeModalModified: () => {
    const buttonPreciseLocator = 'button[data-test-confirm-button] span';
    cy.get(buttonPreciseLocator).click();
    cy.wait(500);
  },
  verifyUnSelectedCheckboxPrintSlip: () => {
    cy.expect(modalCheckbox.is({ disabled: false, checked: false }));
  },
  verifySelectedCheckboxPrintSlip: () => {
    cy.expect(modalCheckbox.is({ disabled: false, checked: true }));
  },
  unselectCheckboxPrintSlip: () => {
    cy.do(modalCheckbox.click());
  },
  unselectCheckboxPrintSlipModified: () => {
    const checkBoxPreciseLocator = 'div[data-test-confirm-status-modal] input[type="checkbox"]';
    cy.expect(Modal().find(Checkbox('Print slip')).exists());
    cy.get(checkBoxPreciseLocator).click();
  },
  checkModalMessage: (item) => {
    const message = `Place ${item.title} (${item.materialType}) (Barcode: ${item.barcode}) on Hold Shelf at ${item.servicePoint} for request`;
    cy.expect(Modal({ content: including(message) }).exists());
  },
  checkPatronComments: (comment) => {
    cy.expect(Modal({ content: including(comment) }).exists());
  },
};
