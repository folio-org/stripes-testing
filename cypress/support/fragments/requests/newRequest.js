/* eslint-disable cypress/no-unnecessary-waiting */
import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  MultiColumnListCell,
  Pane,
  Link,
  Section,
  Select,
  Spinner,
  TextArea,
  TextField,
  Option,
  including,
  Modal,
  KeyValue,
} from '../../../../interactors';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../constants';
import dateTools from '../../utils/dateTools';
import InteractorsTools from '../../utils/interactorsTools';
import SelectUser from './selectUser';

const rootSection = Pane({ title: 'New request' });
const itemInformationAccordion = Accordion('Item information');
const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const instanceHridInput = TextField({ name: 'instance.hrid' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const selectServicePoint = Select({ name: 'pickupServicePointId' });
const selectRequestType = Select({ name: 'requestType' });
const titleLevelRequest = Checkbox({ name: 'createTitleLevelRequest' });
const selectItemPane = Pane({ id: 'items-dialog-instance-items-list' });
const requestInfoSection = Section({ id: 'new-requester-info' });
const itemInfoSection = Section({ id: 'new-item-info' });
const title = 'Title';
const tlRequest = 'Title level requests';
const contributors = 'Contributor';
const PublicationDate = 'Publication date';
const edition = 'Edition';
const isbn = 'ISBN(s)';

function addRequester(userName) {
  cy.do(Button({ id: 'requestform-addrequest' }).click());
  SelectUser.searchUser(userName);
  SelectUser.selectUserFromList(userName);
}

function openNewRequestPane() {
  cy.do([actionsButton.click(), newRequestButton.click()]);
}

function printPickSlips() {
  cy.do([actionsButton.click(), Button({ id: 'printPickSlipsBtn' }).click()]);
  InteractorsTools.checkCalloutMessage(
    'Print options loading in progress. It might take a few seconds, please be patient.',
  );
}

export default {
  addRequester,
  openNewRequestPane,
  printPickSlips,

  fillRequiredFields(newRequest) {
    if ('instanceHRID' in newRequest) {
      cy.expect(Checkbox({ name: 'createTitleLevelRequest', disabled: false }).exists());
      cy.do(titleLevelRequest.click());
      cy.do(instanceHridInput.fillIn(newRequest.instanceHRID));
      cy.intercept('/inventory/instances?*').as('getLoans');
      cy.do(itemInfoSection.find(Button('Enter')).click());
    } else {
      cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
      cy.intercept('/circulation/loans?*').as('getLoans');
      cy.do(enterItemBarcodeButton.click());
    }
    cy.wait('@getLoans');
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists);
    cy.wait('@getUsers');
    cy.do(selectRequestType.choose(newRequest.requestType));
  },

  choosePickupServicePoint(pickupServicePoint) {
    cy.do(selectServicePoint.choose(pickupServicePoint));
    cy.expect(HTML(including(pickupServicePoint)).exists());
  },

  saveRequestAndClose: () => cy.do(saveAndCloseButton.click()),
  waitLoading: () => cy.expect(Pane({ title: 'Request Detail' }).exists()),

  createNewRequest(newRequest) {
    openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.choosePickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  createDeliveryRequest(newRequest) {
    this.openNewRequestPane();
    this.fillRequiredFields(newRequest);
    // need to wait until instanceId is uploaded
    cy.wait(2500);
    this.saveRequestAndClose();
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
    this.choosePickupServicePoint(newRequest.pickupServicePoint);
    // need to wait for loading dropdown options
    cy.wait(1000);
    this.chooseRequestType(REQUEST_TYPES.PAGE);
    this.saveRequestAndClose();
    this.waitLoading();
  },

  enableTitleLevelRequest() {
    // need to synchronize actions before click
    cy.wait(3000);
    cy.do(titleLevelRequest.click());
  },

  waitLoadingNewRequestPage(TLR = false) {
    cy.expect(rootSection.exists());
    if (TLR) cy.expect(titleLevelRequest.exists());
    cy.expect([
      itemInformationAccordion.exists(),
      Accordion('Request information').exists(),
      Accordion('Requester information').exists(),
    ]);
  },

  waitLoadingNewTitleRequestPage(TLR = false) {
    cy.expect(rootSection.exists());
    if (TLR) cy.expect(titleLevelRequest.exists());
    cy.expect([
      Accordion('Title information').exists(),
      Accordion('Request information').exists(),
      Accordion('Requester information').exists(),
    ]);
  },

  enterItemInfo(barcode) {
    cy.do([itemBarcodeInput.fillIn(barcode), enterItemBarcodeButton.click()]);
  },

  enterHridInfo(hrid) {
    cy.do(titleLevelRequest.click());
    cy.do(instanceHridInput.fillIn(hrid));
    cy.do(itemInfoSection.find(Button('Enter')).click());
  },

  verifyErrorMessage(message) {
    cy.expect(HTML(including(message)).exists());
  },

  verifyTitleLevelRequestsCheckbox(isChecked = false) {
    cy.expect(titleLevelRequest.exists());
    cy.expect(titleLevelRequest.has({ checked: isChecked }));
  },

  verifyErrorMessageForRequestTypeField: (errorMessage) => {
    cy.expect(selectRequestType.has({ error: errorMessage }));
  },

  verifyItemInformation: (allContentToCheck) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(Section({ id: 'new-item-info' }, including(contentToCheck)).exists()));
  },

  verifyTitleInformation() {
    this.verifyItemInformation([
      tlRequest,
      title,
      contributors,
      PublicationDate,
      edition,
      isbn,
      PublicationDate,
    ]);
  },

  chooseItemInSelectItemPane: (itemBarcode) => {
    cy.expect(selectItemPane.exists());
    return cy.do(selectItemPane.find(MultiColumnListCell(itemBarcode)).click());
  },

  verifyHridInformation: (allContentToCheck) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(HTML({ id: 'section-instance-info' }, including(contentToCheck)).exists()));
  },

  verifyRequestInformation: (itemStatus) => {
    if (itemStatus === ITEM_STATUS_NAMES.AVAILABLE) {
      cy.expect(Section({ id: 'new-request-info' }, including('Page')).exists());
    } else if (itemStatus === REQUEST_TYPES.HOLD || itemStatus === REQUEST_TYPES.RECALL) {
      cy.expect(Select({ name: 'requestType' }).exists());
    }
    cy.expect([
      TextField({ id: 'requestExpirationDate' }).exists(),
      TextArea({ id: 'patronComments' }).exists(),
    ]);
  },

  verifyRequesterInformation: (userName, userBarcode, patronGroupName) => {
    cy.expect(requestInfoSection.find(Link(including(userName))).exists());
    cy.expect(requestInfoSection.find(Link(including(userBarcode))).exists());
    cy.expect(requestInfoSection.find(HTML(patronGroupName)).exists());
  },

  enterRequestAndPatron(patron) {
    cy.do([
      TextField({ id: 'requestExpirationDate' }).fillIn(dateTools.getCurrentDate()),
      TextArea({ id: 'patronComments' }).fillIn(patron),
    ]);
    this.enableTitleLevelRequest();
    cy.expect(Spinner().absent());
  },

  chooseRequestType(requestType) {
    cy.do(selectRequestType.choose(requestType));
  },

  verifyRequestTypeHasOptions(...options) {
    options.forEach((option) => {
      cy.expect(HTML(option).exists());
    });
    // options.length + 1 (defalt option 'Select request type')
    cy.get('[name="requestType"] option').should('have.length', options.length + 1);
  },

  enterRequesterInfo(newRequest) {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(selectServicePoint.exists());
    cy.wait('@getUsers');
    this.choosePickupServicePoint(newRequest.pickupServicePoint);
  },

  enterRequesterBarcode: (requesterBarcode) => {
    cy.do(requesterBarcodeInput.fillIn(requesterBarcode));
    cy.do(enterRequesterBarcodeButton.click());
    // wait until requestType select become enabled
    cy.wait(2000);
    // check is requestType select 'enabled', if 'disabled' - click [Enter] button for [Requester barcode] again
    cy.get('[name="requestType"]')
      .invoke('is', ':enabled')
      .then((state) => {
        cy.log(state);
        if (!state) {
          cy.do(enterRequesterBarcodeButton.click());
        }
      });
  },

  verifyFulfillmentPreference: (preference) => {
    cy.expect(
      Select({ name: 'fulfillmentPreference' }, including(Option({ value: preference }))).exists(),
    );
  },

  enterRequesterInfoWithRequestType(newRequest, requestType = REQUEST_TYPES.PAGE, fulfillmentPreference = 'Hold Shelf') {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.wait(2000);
    cy.do(enterRequesterBarcodeButton.click());
    cy.wait(1000);
    this.chooseRequestType(requestType);
    cy.wait(1000);
    cy.do(Select({ name: 'fulfillmentPreference' }).choose(fulfillmentPreference));
    cy.wait(1000);
    cy.expect(selectServicePoint.exists());
    cy.wait('@getUsers');
    this.choosePickupServicePoint(newRequest.pickupServicePoint);
  },
  checkPatronblockedModal(reason) {
    cy.expect(
      Modal(' Patron blocked from requesting').has({
        message: including(reason),
      }),
    );
  },
  openBlockDetails() {
    cy.do(Button('View block details').click());
  },
  checkRequestIsNotAllowedModal() {
    cy.expect(
      Modal('Request not allowed').has({
        message: 'This requester already has an open request for this item',
      }),
    );
  },
  checkRequestIsNotAllowedInstanceModal() {
    cy.expect(
      Modal('Request not allowed').has({
        message: 'This requester already has an open request for this instance',
      }),
    );
  },
  checkRequestIsOpenForOneOfTheInstancesItems() {
    cy.expect(
      Modal('Request not allowed').has({
        message: "This requester already has an open request for one of the instance's items",
      }),
    );
  },
  checkRequestIsNotAllowedLoanModal() {
    cy.expect(
      Modal('Request not allowed').has({
        message: 'This requester already has this item on loan',
      }),
    );
  },
  verifyRequestSuccessfullyCreated(username) {
    InteractorsTools.checkCalloutMessage(
      including(`Request has been successfully created for ${username}`),
    );
  },
  checkItemInformationSecton(instanceTitle, location, itemStatus) {
    cy.expect([
      KeyValue('Title').has({ value: instanceTitle }),
      KeyValue('Effective location').has({ value: location }),
      KeyValue('Item status').has({ value: itemStatus }),
    ]);
  },
  checkTitleInformationSection(data) {
    InteractorsTools.checkKeyValue(itemInfoSection, 'Title', data.instanceTitle);
    InteractorsTools.checkKeyValue(itemInfoSection, 'Title level requests', data.titleLevelRequest);
  },
  checkTLRRequestsFields(instanceHrid) {
    cy.expect([
      rootSection.exists(),
      TextField({ name: 'instance.hrid' }).has({ value: instanceHrid }),
      itemInformationAccordion.absent(),
      cancelButton.has({ disabled: false, visible: true }),
      saveAndCloseButton.has({ disabled: false, visible: true }),
    ]);
  },
  checkRequestsFields() {
    cy.expect([
      rootSection.exists(),
      itemInformationAccordion.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      saveAndCloseButton.has({ disabled: true, visible: true }),
    ]);
  },

  openTitleLookUp() {
    cy.do(rootSection.find(Button({ id: 'find-instance-trigger' })).click());
  },
};
