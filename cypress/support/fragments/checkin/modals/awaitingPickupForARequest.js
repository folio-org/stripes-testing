import { Button, Modal, Checkbox, HTML, including } from '../../../../../interactors';

const modalTitle = 'Awaiting pickup for a request';
const modalCheckbox = Modal(modalTitle).find(Checkbox('Print slip'));

export default {
  verifyModalTitle:() => {
    cy.expect(Modal(modalTitle)
      .exists());
  },
  closeModal:() => {
    cy.do(Button('Close').click());
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
    cy.get('div[class*="modalContent"]').should('include.text', message);
  }
};
