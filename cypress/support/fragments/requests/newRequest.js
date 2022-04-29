import { Button, TextField, Pane, Select } from '../../../../interactors';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button({ id: 'clickable-save-request' });

export default {
  openNewRequestPane() {
    cy.intercept('/cancellation-reason-storage/cancellation-reasons').as('getReasons');
    cy.do([
      actionsButton.click(),
      newRequestButton.click()
    ]);
    cy.wait('@getReasons');
  },

  fillRequiredFields(newRequest) {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(Select({ name:'pickupServicePointId' }).exists);
    cy.wait('@getUsers');
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.wait('@getLoans');
  },

  choosepickupServicePoint(pickupServicePoint) {
    cy.do(Select({ name:'pickupServicePointId' }).choose(pickupServicePoint));
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
