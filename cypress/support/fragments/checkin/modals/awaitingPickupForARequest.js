import { Button, Modal, Checkbox, including } from '../../../../../interactors';

const modalTitle = 'In trasnist';
const modalCheckbox = Modal(modalTitle).find(Checkbox('Print slip'));

export default {
  verifyModalTitle: () => {
    cy.expect(Modal(modalTitle).exists());
  },
  closeModal: () => {
    cy.do(Button('Close').click());
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
  checkModalMessage: (item) => {
    const message = `Place ${item.title} (${item.materialType}) (Barcode: ${item.barcode}) on Hold Shelf at ${item.servicePoint} for request`;
    cy.expect(Modal({ content: including(message) }).exists());
  },
  checkPatronComments: (comment) => {
    cy.expect(Modal({ content: including(comment) }).exists());
  },
};
