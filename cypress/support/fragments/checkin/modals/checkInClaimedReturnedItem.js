import { Button, Modal, including, HTML } from '../../../../../interactors';

const checkInModal = Modal('Check in claimed returned item');
const returnedByPatronButton = Button('Returned by patron');
const foundByPatron = Button('Found by library');

export default {
  closeModal:() => {
    cy.do(checkInModal.dismiss());
  },
  verifyModalContent: (itemBarcode) => {
    cy.expect(HTML(including(itemBarcode)).exists());
  },
  chooseItemReturnedByPatron: () => {
    cy.do([returnedByPatronButton.exists(),
      returnedByPatronButton.click()]);
  },
  chooseItemReturnedByLibrary: () => {
    cy.do([foundByPatron.exists(),
      foundByPatron.click()]);
  },
  verifyModalIsClosed() {
    cy.expect(checkInModal.absent());
  }
};
