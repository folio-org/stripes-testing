import { Button, Modal, Checkbox, HTML, including } from '../../../../../interactors';

const modalTitle = 'In transit';
const modalCheckbox = Modal(modalTitle).find(Checkbox('Print slip'));

export default {
  verifyModalTitle: () => {
    cy.expect(Modal(modalTitle).exists());
  },
  closeModal: () => {
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
    const message = `Route ${item.title} (${item.materialType}) (Barcode: ${item.barcode}) to ${item.servicePoint}.Print slip`;
    cy.expect(Modal({ content: including(message) }).exists());
    // cy.expect(HTML(including(message)).exists());
    // cy.get('div[class*="modalContent"]').should('include.text', message);
    // cy.get('div[class*="modalContent"]')
    //   .invoke('text')
    //   .then((text) => {
    //     expect(text.trim()).to.eq(message);
    //   });
  },
};
