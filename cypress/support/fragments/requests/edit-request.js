import add from 'date-fns/add';
import { including } from '@interactors/html';
import { Button, KeyValue, Section, Select, TextField, TextArea } from '../../../../interactors';
import { FULFILMENT_PREFERENCES } from '../../constants';
import Requests from './requests';
import DateTools from '../../utils/dateTools';

const paneResultsSection = Section({ id: 'pane-results' });
const requestPreviewSection = Section({ id: 'instance-details' });
const actionsButton = requestPreviewSection.find(Button('Actions'));
const editRequestButton = Button('Edit');
const saveAndCloseButton = Button('Save & close');
const closeButton = Button({ icon: 'times' });
const requestExpirationDateInput = TextField({ id: 'requestExpirationDate' });
const fulfillmentPreferenceSelect = Select({ name: 'fulfillmentPreference' });
const pickupServicePointSelect = Select({ name: 'pickupServicePointId' });
const holdShelfExpirationDateInput = TextField({ name: 'holdShelfExpirationDate' });
const deliveryTypeAddressTypeSelect = Select({ name: 'deliveryAddressTypeId' });
const requestExpirationDateKeyValue = KeyValue('Request expiration date');
const holdShelfExpirationDateKeyValue = KeyValue('Hold shelf expiration date');
const pickupServicePointKeyValue = KeyValue('Pickup service point');
const patronComment = TextArea({ id: 'patronComments' });

const expirationDates = [...new Array(5)].map((_, i) => {
  const date = add(new Date(), { years: 1, days: i + 1 });
  return {
    formValue: DateTools.getFormattedDate({ date }),
    uiValue: DateTools.getFormattedDateWithSlashes({ date }),
  };
});

export default {
  servicePoint: 'Circ Desk 1',

  requestStatuses: {
    NOT_YET_FILLED: 'Open - Not yet filled',
    IN_TRANSIT: 'Open - In transit',
    AWAITING_PICKUP: 'Open - Awaiting pickup',
    AWAITING_DELIVERY: 'Open - Awaiting delivery',
  },

  expirationDates,

  updateRequestApi(requestData) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `circulation/requests/${requestData.id}`,
        body: requestData,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },

  checkIsEditsBeingSaved(requestData, instanceRecordData, status) {
    this.updateRequestApi({ ...requestData, status }).then(() => {
      switch (status) {
        case this.requestStatuses.NOT_YET_FILLED:
        case this.requestStatuses.IN_TRANSIT:
          return this.editAndCheckNotFilledAndInTransitRequest(instanceRecordData, status);
        case this.requestStatuses.AWAITING_PICKUP:
          return this.editAndCheckAwaitingPickupRequest(instanceRecordData);
        case this.requestStatuses.AWAITING_DELIVERY:
          return this.editAndCheckAwaitingDeliveryRequest(instanceRecordData);
        default:
          throw new Error('Incorrect status');
      }
    });
  },

  editAndCheckNotFilledAndInTransitRequest(instanceRecordData, status) {
    const isTransit = status === this.requestStatuses.IN_TRANSIT ? 1 : 0;
    if (isTransit === 1) {
      Requests.selectInTransitRequest();
    } else {
      Requests.selectNotYetFilledRequest();
    }
    this.findAndOpenCreatedRequest(instanceRecordData);
    cy.expect(requestExpirationDateInput.has({ disabled: false }));
    cy.expect(fulfillmentPreferenceSelect.has({ disabled: false }));
    cy.expect(pickupServicePointSelect.has({ disabled: false }));
    cy.do(fulfillmentPreferenceSelect.choose(FULFILMENT_PREFERENCES.DELIVERY));
    cy.expect(deliveryTypeAddressTypeSelect.has({ disabled: false }));
    cy.do(fulfillmentPreferenceSelect.choose(FULFILMENT_PREFERENCES.HOLD_SHELF));
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[isTransit].formValue));
    cy.wait(500);
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    cy.wait(500);
    this.saveAndClose();
    cy.wait(2000);
    cy.expect(
      requestExpirationDateKeyValue.has({ value: this.expirationDates[isTransit].uiValue }),
    );
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
  },

  editAndCheckAwaitingPickupRequest(instanceRecordData) {
    Requests.selectAwaitingPickupRequest();
    this.findAndOpenCreatedRequest(instanceRecordData);
    cy.expect(holdShelfExpirationDateInput.has({ disabled: false }));
    cy.expect(requestExpirationDateInput.has({ disabled: false }));
    cy.expect(fulfillmentPreferenceSelect.has({ disabled: true }));
    cy.expect(pickupServicePointSelect.has({ disabled: false }));
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[2].formValue));
    cy.do(holdShelfExpirationDateInput.fillIn(this.expirationDates[3].formValue));
    this.saveAndClose();
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
    cy.expect(requestExpirationDateKeyValue.has({ value: this.expirationDates[2].uiValue }));
    cy.expect(
      holdShelfExpirationDateKeyValue.has({ value: including(this.expirationDates[3].uiValue) }),
    );
  },

  editAndCheckAwaitingDeliveryRequest(instanceRecordData, request) {
    Requests.selectAwaitingDeliveryRequest();
    this.findAndOpenCreatedRequest(instanceRecordData, request);
    cy.expect(requestExpirationDateInput.has({ disabled: false }));
    cy.expect(fulfillmentPreferenceSelect.has({ disabled: true }));
    cy.expect(pickupServicePointSelect.has({ disabled: false }));
    cy.expect(holdShelfExpirationDateKeyValue.has({ value: 'No value set-' }));
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[4].formValue));
    this.saveAndClose();
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
    cy.expect(requestExpirationDateKeyValue.has({ value: this.expirationDates[4].uiValue }));
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

  waitRequestEditFormLoad() {
    // before submitting request form, some waiting is needed,
    // otherwise, "Submit Validation Failed" error is thrown
    // the error might be coming from the below
    // see: https://github.com/folio-org/ui-requests/blob/ba8f70d89a23601f8c888a6e664f2ecd8cada239/src/ViewRequest.js#L211
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1200);
  },

  resetFiltersAndReloadPage() {
    this.closeRequestPreview();
    Requests.resetAllFilters();
    // since changes doesn't show up automatically
    // after updating request via API, reloading page is necessary
    cy.reload();
    cy.expect(paneResultsSection.exists());
  },

  verifyPatronCommentsFieldIsNotEditable: () => {
    cy.expect(patronComment.absent());
  },
};
