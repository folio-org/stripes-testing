/* eslint-disable cypress/no-unnecessary-waiting */
import { Button, TextField, Pane, Select, HTML, including } from '../../../../interactors';
import SelectUser from './selectUser';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button('Save & close');
const selectServicePoint = Select({ name:'pickupServicePointId' });
const selectRequestType = Select({ name: 'requestType' });

function addRequester(userName) {
  cy.do(Button({ id:'requestform-addrequest' }).click());
  SelectUser.searchUser(userName);
  SelectUser.selectUserFromList(userName);
}

function openNewRequestPane() {
  cy.do([
    actionsButton.click(),
    newRequestButton.click()
  ]);
}

export default {
  addRequester,
  openNewRequestPane,

  fillRequiredFields(newRequest) {
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.do(selectRequestType.choose(newRequest.requestType));
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
    openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  createDeliveryRequest(newRequest) {
    openNewRequestPane();
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.do(enterItemBarcodeButton.click());
    cy.do(Select({ name: 'fulfilmentPreference' }).choose(newRequest.requestType));
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.do(enterRequesterBarcodeButton.click());
    // need to wait until instanceId is uploaded
    cy.wait(2500);
    cy.expect(selectServicePoint.exists);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  createWithUserName(newRequest) {
    openNewRequestPane();
    addRequester(newRequest.requesterName);
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists);
    cy.wait('@getUsers');
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.wait('@getLoans');
    // need to wait until instanceId is uploaded
    cy.wait(2500);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  }
};
