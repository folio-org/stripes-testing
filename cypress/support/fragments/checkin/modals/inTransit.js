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
  verifyUnSelectedCheckbox: () => {
    cy.expect(modalCheckbox.is({ disabled: false, checked: false }));
  },
  verifySelectedCheckbox: () => {
    cy.expect(modalCheckbox.is({ disabled: false, checked: true }));
  },
  unselectChechbox: () => {
    cy.do(modalCheckbox.click());
  },
  getModalCheckbox: () => {
    return modalCheckbox;
  },
};
