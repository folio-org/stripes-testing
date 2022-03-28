import { including } from '@interactors/html';
import { Button, KeyValue, Section, Select, TextField } from '../../../../interactors';
import Requests from './requests';

const paneResultsSection = Section({ id: 'pane-results' });
const requestPreviewSection = Section({ id: 'instance-details' });
const actionsButton = requestPreviewSection.find(Button('Actions'));
const editRequestButton = Button('Edit');
const saveAndCloseButton = Button('Save & close');
const closeButton = Button({ icon: 'times' });
const requestExpirationDateInput = TextField({ id: 'requestExpirationDate' });
const fulfillmentPreferenceSelect = Select({ name: 'fulfilmentPreference' });
const pickupServicePointSelect = Select({ name: 'pickupServicePointId' });
const holdShelfExpirationDateInput = TextField({ name: 'holdShelfExpirationDate' });
const requestExpirationDateKeyValue = KeyValue('Request expiration date');
const holdShelfExpirationDateKeyValue = KeyValue('Hold shelf expiration date');
const pickupServicePointKeyValue = KeyValue('Pickup service point');

export default {
  servicePoint: 'Circ Desk 1',

  requestStatuses: {
    NOT_YET_FILLED: 'Open - Not yet filled',
    IN_TRANSIT: 'Open - In transit',
    AWAITING_PICKUP: 'Open - Awaiting pickup',
    AWAITING_DELIVERY: 'Open - Awaiting delivery',
  },

  expirationDates: [
    { formValue: '2050-01-01', uiValue: '1/1/2050' },
    { formValue: '2050-01-02', uiValue: '1/2/2050' },
    { formValue: '2050-01-03', uiValue: '1/3/2050' },
    { formValue: '2050-01-04', uiValue: '1/4/2050' },
    { formValue: '2050-01-05', uiValue: '1/5/2050' },
  ],

  createInstance({
    instanceTypeId,
    instanceTitle,
    holdingsTypeId,
    permanentLocationId,
    sourceId,
    itemBarcode,
    permanentLoanTypeId,
    materialTypeId
  }) {
    return cy.createInstance({
      instance: {
        instanceTypeId,
        title: instanceTitle,
      },
      holdings: [{
        holdingsTypeId,
        permanentLocationId,
        sourceId,
      }],
      items: [
        [{
          barcode: itemBarcode,
          status: { name: 'Available' },
          permanentLoanType: { id: permanentLoanTypeId },
          materialType: { id:  materialTypeId },
        }],
      ],
    });
  },

  createRequest(requestData) {
    return cy.createRequest(requestData);
  },

  updateRequest(requestData, status) {
    return cy.changeItemRequestApi({ ...requestData, status });
  },

  checkIsEditsBeingSaved(requestData, instanceRecordData, status) {
    this.updateRequest(requestData, status).then(() => {
      switch (status) {
        case this.requestStatuses.NOT_YET_FILLED:
          return this.editAndCheckNotFilledRequest(instanceRecordData);
        case this.requestStatuses.IN_TRANSIT:
          return this.editAndCheckInTransitRequest(instanceRecordData);
        case this.requestStatuses.AWAITING_PICKUP:
          return this.editAndCheckAwaitingPickupRequest(instanceRecordData);
        case this.requestStatuses.AWAITING_DELIVERY:
          return this.editAndCheckAwaitingDeliveryRequest(instanceRecordData);
        default:
          throw new Error('Incorrect status');
      }
    });
  },

  editAndCheckNotFilledRequest(instanceRecordData) {
    Requests.selectNotYetFilledRequest();
    this.findAndOpenCreatedRequest(instanceRecordData);
    this.checkIsRequestExpirationDateEditable(true);
    this.checkIsFulfillmentPreferenceEditable(true);
    this.checkIsPickupServicePointIdEditable(true);
    this.updateRequestExpirationDate(this.expirationDates[0].formValue);
    this.updatePickupServicePoint(this.servicePoint);
    this.saveAndClose();
    this.verifyRequestExpirationDate(this.expirationDates[0].uiValue);
    this.verifyPickupServicePoint(this.servicePoint);
  },

  editAndCheckInTransitRequest(instanceRecordData) {
    Requests.selectInTransitRequest();
    this.findAndOpenCreatedRequest(instanceRecordData);
    this.checkIsRequestExpirationDateEditable(true);
    this.checkIsFulfillmentPreferenceEditable(true);
    this.checkIsPickupServicePointIdEditable(true);
    this.updatePickupServicePoint(this.servicePoint);
    this.updateRequestExpirationDate(this.expirationDates[1].formValue);
    this.saveAndClose();
    this.verifyRequestExpirationDate(this.expirationDates[1].uiValue);
    this.verifyPickupServicePoint(this.servicePoint);
  },

  editAndCheckAwaitingPickupRequest(instanceRecordData) {
    Requests.selectAwaitingPickupRequest();
    this.findAndOpenCreatedRequest(instanceRecordData);
    this.checkIsHoldShelfExpirationDateEditable(true);
    this.checkIsRequestExpirationDateEditable(true);
    this.checkIsFulfillmentPreferenceEditable(false);
    this.checkIsPickupServicePointIdEditable(true);
    this.updatePickupServicePoint(this.servicePoint);
    this.updateRequestExpirationDate(this.expirationDates[2].formValue);
    this.updateHoldShelfExpirationDate(this.expirationDates[3].formValue);
    this.saveAndClose();
    this.verifyPickupServicePoint(this.servicePoint);
    this.verifyRequestExpirationDate(this.expirationDates[2].uiValue);
    this.verifyHoldShelfExpirationDate(this.expirationDates[3].uiValue);
  },

  editAndCheckAwaitingDeliveryRequest(instanceRecordData, request) {
    Requests.selectAwaitingDeliveryRequest();
    this.findAndOpenCreatedRequest(instanceRecordData, request);
    this.checkIsRequestExpirationDateEditable(true);
    this.checkIsFulfillmentPreferenceEditable(false);
    this.checkIsPickupServicePointIdEditable(true);
    this.checkIsHoldShelfExpirationDateNotSet();
    this.updatePickupServicePoint(this.servicePoint);
    this.updateRequestExpirationDate(this.expirationDates[4].formValue);
    this.saveAndClose();
    this.verifyPickupServicePoint(this.servicePoint);
    this.verifyRequestExpirationDate(this.expirationDates[4].uiValue);
  },

  findAndOpenCreatedRequest(instanceRecordData) {
    Requests.findCreatedRequest(instanceRecordData.instanceTitle);
    Requests.selectFirstRequest(instanceRecordData.instanceTitle);
    this.openRequestEditForm();
    this.waitRequestEditFormLoad();
  },

  openRequestEditForm() {
    cy.do([actionsButton.click(), editRequestButton.click()]);
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
    cy.expect(requestPreviewSection.exists());
  },

  closeRequestPreview() {
    cy.do(closeButton.click());
  },

  checkIsRequestExpirationDateEditable(isEditable) {
    cy.expect(requestExpirationDateInput.has({ disabled: !isEditable }));
  },

  checkIsFulfillmentPreferenceEditable(isEditable) {
    cy.expect(fulfillmentPreferenceSelect.has({ disabled: !isEditable }));
  },

  checkIsPickupServicePointIdEditable(isEditable) {
    cy.expect(pickupServicePointSelect.has({ disabled: !isEditable }));
  },

  checkIsHoldShelfExpirationDateEditable(isEditable) {
    cy.expect(holdShelfExpirationDateInput.has({ disabled: !isEditable }));
  },

  checkIsHoldShelfExpirationDateNotSet() {
    cy.expect(holdShelfExpirationDateKeyValue.has({ value: '-' }));
  },

  updateRequestExpirationDate(dateString) {
    cy.do(requestExpirationDateInput.fillIn(dateString));
  },

  updateHoldShelfExpirationDate(value) {
    cy.do(holdShelfExpirationDateInput.fillIn(value));
  },

  updatePickupServicePoint(value) {
    cy.do(pickupServicePointSelect.choose(value));
  },

  verifyRequestExpirationDate(value) {
    cy.expect(requestExpirationDateKeyValue.has({ value }));
  },

  verifyPickupServicePoint(value) {
    cy.expect(pickupServicePointKeyValue.has({ value }));
  },

  verifyHoldShelfExpirationDate(value) {
    cy.expect(holdShelfExpirationDateKeyValue.has({ value: including(value) }));
  },

  waitRequestEditFormLoad() {
    // before submitting request form, some waiting is needed,
    // otherwise, "Submit Validation Failed" error is thrown
    // the error may be coming from the below
    // see: https://github.com/folio-org/ui-requests/blob/ba8f70d89a23601f8c888a6e664f2ecd8cada239/src/ViewRequest.js#L211
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
  },

  resetFiltersAndReloadPage() {
    this.closeRequestPreview();
    Requests.resetAllFilters();

    // since changes doesn't show up automatically
    // after updating request via API, reloading page is necessary
    cy.reload();
    cy.expect(paneResultsSection.exists());
  }
};
