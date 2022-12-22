import { Button, TextField, Pane, Select, HTML, including } from '../../../../interactors';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button('Save & close');
const selectServicePoint = Select({ name:'pickupServicePointId' });

export default {
  openNewRequestPane() {
    cy.do([
      actionsButton.click(),
      newRequestButton.click()
    ]);
  },

  fillRequiredFields(newRequest) {
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.wait('@getLoans');
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists);
    cy.wait('@getUsers');
  },

  choosepickupServicePoint(pickupServicePoint) {
    cy.do(selectServicePoint.choose(pickupServicePoint));
    cy.expect(HTML(including(pickupServicePoint)).exists());
  },

  saveRequestAndClose:() => cy.do(saveAndCloseButton.click()),
  waitLoading:() => cy.expect(Pane({ title: 'Request Detail' }).exists()),

  createNewRequest(newRequest) {
    this.openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  createDeliveryRequest(newRequest) {
    this.openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.saveRequestAndClose();
    // TODO investigate what to wait
    cy.wait(1000);
    this.waitLoading();
  }
};
