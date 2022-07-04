import { Button, Modal, Checkbox } from '../../../../../interactors';

const modalTitle = 'In transit';
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
  getModalCheckbox: () => {
    return modalCheckbox;
  },
};
