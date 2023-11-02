import { Button, Modal, including, HTML } from '../../../../../interactors';

const checkInModal = Modal('Check in claimed returned item');
const cancelButton = Button('Cancel');
const returnedByPatronButton = Button('Returned by patron');
const foundByLibraryButton = Button('Found by library');

export default {
  closeModal: () => {
    cy.do(checkInModal.dismiss());
  },
  verifyModalContent: (itemBarcode) => {
    cy.expect(HTML(including(itemBarcode)).exists());
  },
  chooseItemReturnedByPatron: () => {
    cy.do([returnedByPatronButton.exists(), returnedByPatronButton.click()]);
  },
  chooseItemReturnedByLibrary: () => {
    cy.do([foundByLibraryButton.exists(), foundByLibraryButton.click()]);
  },
  verifyModalIsClosed() {
    cy.expect(checkInModal.absent());
  },
  checkModalMessage: (item) => {
    const message = `${item.title} (${item.materialType}) (Barcode: ${item.barcode}) has been claimed returned`;
    cy.expect([
      Modal({ content: including(message) }).exists(),
      checkInModal.find(cancelButton).is({ disabled: false }),
      checkInModal.find(foundByLibraryButton).is({ disabled: false }),
      checkInModal.find(returnedByPatronButton).is({ disabled: false }),
    ]);
  },
};
