import { Button, TextField, Pane } from '../../../../interactors';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button({ id: 'clickable-save-request' });

export default {
  openNewRequestPane() {
    cy.do([
      actionsButton.click(),
      newRequestButton.click()
    ]);
  },

  fillRequiredFields(newRequest) {
    cy.do([
      requesterBarcodeInput.fillIn(newRequest.requesterBarcode),
      enterRequesterBarcodeButton.click(),
      itemBarcodeInput.fillIn(newRequest.itemBarcode),
      enterItemBarcodeButton.click(),
    ]);
  },

  choosepickupServicePoint(pickupServicePoint) {
    cy.do(cy.get('[name="pickupServicePointId"]').select(pickupServicePoint));
  },

  saveRequestAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  waitLoading() {
    cy.expect(Pane({ title: 'Request Detail' }).exists());
  },

  createNewRequest(newRequest) {
    this.openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  }
};
