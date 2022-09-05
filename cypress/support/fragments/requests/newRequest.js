import { Button, TextField, Pane, Select, HTML, including, Callout, KeyValue, Section, Link } from '../../../../interactors';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button({ id: 'clickable-save-request' });
const selectServicePoint = Select({ name:'pickupServicePointId' });

export default {
  openNewRequestPane() {
    cy.do([
      actionsButton.click(),
      newRequestButton.click()
    ]);
  },

  fillRequiredFields(newRequest, requestType) {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists);
    cy.wait('@getUsers');
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.do(Select({ name : 'requestType' }).choose(requestType));
    cy.wait('@getLoans');
    cy.wait(1500);
  },

  choosepickupServicePoint(pickupServicePoint) {
    cy.do(selectServicePoint.choose(pickupServicePoint));
    cy.expect(HTML(including(pickupServicePoint)).exists());
  },

  saveRequestAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  waitLoading() {
    cy.expect(Pane({ title: 'Request Detail' }).exists());
  },

  createNewRequest(newRequest, requestType = 'Hold') {
    this.openNewRequestPane();
    cy.wait(5000); // waiting for the form to be rendered
    this.fillRequiredFields(newRequest, requestType);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  checkCreatedNewRequest(newRequest, requestType = 'Hold') {
    cy.expect([
      KeyValue('Item barcode').has({ value : newRequest.itemBarcode }),
      KeyValue('Pickup service point').has({ value : newRequest.pickupServicePoint }),
      KeyValue('Request type').has({ value : requestType }),
      Section({ id: 'requester-info' }).find(Link(requestType.requesterBarcode)).exists(),
      Callout({ type : 'success' }).has({ textContent: `Request has been successfully created for ${newRequest.userProps.lastName}, ${newRequest.userProps.firstName} ${newRequest.userProps.middleName}` })
    ]);
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
