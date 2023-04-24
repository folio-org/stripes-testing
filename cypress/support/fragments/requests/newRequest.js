/* eslint-disable cypress/no-unnecessary-waiting */
import { Button, TextField, Pane, Select, HTML, including, Checkbox, Section, Accordion, TextArea } from '../../../../interactors';
import SelectUser from './selectUser';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const instanceHridInput = TextField({ name: 'instance.hrid' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button('Save & close');
const selectServicePoint = Select({ name:'pickupServicePointId' });
const selectRequestType = Select({ name: 'requestType' });
const titleLevelRequest = Checkbox({ name: 'createTitleLevelRequest' });

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

function fillRequiredFields(newRequest) {
  if ('instanceHRID' in newRequest) {
    cy.expect(Checkbox({ name: 'createTitleLevelRequest', disabled: false }).exists());
    cy.do(titleLevelRequest.click());
    cy.do(instanceHridInput.fillIn(newRequest.instanceHRID));
    cy.intercept('/inventory/instances?*').as('getLoans');
    cy.do(Section({ id: 'new-item-info' }).find(Button('Enter')).click());
  } else {
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
  }
  cy.do(selectRequestType.choose(newRequest.requestType));
  cy.wait('@getLoans');
  cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
  cy.intercept('/proxiesfor?*').as('getUsers');
  cy.do(enterRequesterBarcodeButton.click());
  cy.expect(selectServicePoint.exists);
  cy.wait('@getUsers');
}

function saveRequestAndClose() { cy.do(saveAndCloseButton.click()); }

function choosepickupServicePoint(pickupServicePoint) {
  cy.do(selectServicePoint.choose(pickupServicePoint));
  cy.expect(HTML(including(pickupServicePoint)).exists());
}

function waitLoading() { cy.expect(Pane({ title: 'Request Detail' }).exists()); }

export default {
  addRequester,
  openNewRequestPane,
  fillRequiredFields,
  saveRequestAndClose,
  choosepickupServicePoint,
  waitLoading,

  createNewRequest(newRequest) {
    openNewRequestPane();
    fillRequiredFields(newRequest);
    choosepickupServicePoint(newRequest.pickupServicePoint);
    saveRequestAndClose();
    waitLoading();
  },

  createDeliveryRequest(newRequest) {
    openNewRequestPane();
    cy.do([itemBarcodeInput.fillIn(newRequest.itemBarcode),
      enterItemBarcodeButton.click(),
      selectRequestType.choose(newRequest.requestType),
      requesterBarcodeInput.fillIn(newRequest.requesterBarcode),
      enterRequesterBarcodeButton.click()
    ]);
    cy.expect(selectServicePoint.exists);
    // need to wait until instanceId is uploaded
    cy.wait(2500);
    saveRequestAndClose();
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
    choosepickupServicePoint(newRequest.pickupServicePoint);
    saveRequestAndClose();
    waitLoading();
  },

  waitLoadingNewRequestPage(TLR = false) {
    cy.expect(Pane({ title: 'New request' }).exists());
    if (TLR) cy.expect(Checkbox('Create title level request').exists());
    cy.expect([
      Accordion('Item information').exists(),
      Accordion('Request information').exists(),
      Accordion('Requester information').exists()
    ]);
  },

  enterItemInfo(barcode) {
    cy.do([
      itemBarcodeInput.fillIn(barcode),
      enterItemBarcodeButton.click()
    ]);
  },

  enterHridInfo(hrid) {
    cy.do(titleLevelRequest.click());
    cy.do(instanceHridInput.fillIn(hrid));
    cy.do(Section({ id: 'new-item-info' }).find(Button('Enter')).click());
  },

  verifyErrorMessage(message) {
    cy.expect(HTML(including(message)).exists());
  },

  verifyItemInformation: (allContentToCheck) => {
    return allContentToCheck.forEach(contentToCheck => cy.expect(Section({ id: 'section-item-info' }, including(contentToCheck)).exists));
  },

  verifyHridInformation: (allContentToCheck) => {
    return allContentToCheck.forEach(contentToCheck => cy.expect(Section({ id: 'section-instance-info' }, including(contentToCheck)).exists));
  },

  verifyRequestInformation: (itemStatus) => {
    if (itemStatus === 'Available') {
      cy.expect(Section({ id: 'new-request-info' }, including('Page')).exists);
    } else if (itemStatus === 'Hold' || itemStatus === 'Recall') {
      cy.expect(Select({ name: 'requestType' }).exists);
    }
    cy.expect([
      TextField({ id: 'requestExpirationDate' }).exists(),
      TextArea({ id: 'patronComments' }).exists(),
    ]);
  },

  chooseRequestType(requestType) {
    cy.do(selectRequestType.choose(requestType));
  },

  enterRequesterInfo(newRequest) {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists);
    cy.wait('@getUsers');
    choosepickupServicePoint(newRequest.pickupServicePoint);
  }
};
