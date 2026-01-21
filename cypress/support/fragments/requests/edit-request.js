import add from 'date-fns/add';
import { including } from '@interactors/html';
import {
  Button,
  KeyValue,
  Section,
  Select,
  TextField,
  TextArea,
  Link,
  HTML,
} from '../../../../interactors';
import { FULFILMENT_PREFERENCES } from '../../constants';
import Requests from './requests';
import DateTools from '../../utils/dateTools';
import InteractorsTools from '../../utils/interactorsTools';

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

const requestDetailsSection = Section({ id: 'request' });
const itemInformation = requestDetailsSection.find(Section({ id: 'new-item-info' }));
const titleInformation = requestDetailsSection.find(Section({ id: 'new-instance-info' }));
const requesterInformation = requestDetailsSection.find(Section({ id: 'new-requester-info' }));
const requestInformation = requestDetailsSection.find(Section({ id: 'new-request-info' }));

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
    CLOSED_CANCELLED: 'Closed - Cancelled',
  },

  expirationDates,

  updateRequestApi(requestData) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `circulation/requests/${requestData.id}`,
        body: requestData,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
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
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[isTransit].formValue));
    cy.do(fulfillmentPreferenceSelect.choose(FULFILMENT_PREFERENCES.HOLD_SHELF));
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
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[2].formValue));
    cy.do(holdShelfExpirationDateInput.fillIn(this.expirationDates[3].formValue));
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    this.saveAndClose();
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
    cy.expect(requestExpirationDateKeyValue.has({ value: this.expirationDates[2].uiValue }));
    cy.expect(
      holdShelfExpirationDateKeyValue.has({ value: including(this.expirationDates[3].uiValue) }),
    );
  },

  editPickupServicePoint() {
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    this.saveAndClose();
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
  },

  editAndCheckAwaitingDeliveryRequest(instanceRecordData, request) {
    Requests.selectAwaitingDeliveryRequest();
    this.findAndOpenCreatedRequest(instanceRecordData, request);
    cy.expect(requestExpirationDateInput.has({ disabled: false }));
    cy.expect(fulfillmentPreferenceSelect.has({ disabled: true }));
    cy.expect(pickupServicePointSelect.has({ disabled: false }));
    cy.expect(holdShelfExpirationDateKeyValue.has({ value: 'No value set-' }));
    cy.do(requestExpirationDateInput.fillIn(this.expirationDates[4].formValue));
    cy.do(pickupServicePointSelect.choose(this.servicePoint));
    this.saveAndClose();
    cy.expect(pickupServicePointKeyValue.has({ value: this.servicePoint }));
    cy.expect(requestExpirationDateKeyValue.has({ value: this.expirationDates[4].uiValue }));
  },

  findAndOpenCreatedRequest(instanceRecordData) {
    Requests.findCreatedRequest(instanceRecordData.instanceTitle);
    Requests.selectFirstRequest(instanceRecordData.instanceTitle);
    this.openRequestEditForm();
    this.waitRequestEditFormLoad();
    cy.wait(1000);
  },

  openRequestEditForm() {
    cy.wait(3000);
    cy.do(actionsButton.click());
    cy.wait(3000);
    cy.do(editRequestButton.click());
  },

  saveAndClose() {
    cy.wait(500);
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
    cy.expect(requestPreviewSection.exists());
  },

  verifyRequestSuccessfullyEdited(username) {
    InteractorsTools.checkCalloutMessage(
      including(`Request has been successfully edited for ${username}`),
    );
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
    cy.wait(2000);
  },

  resetFiltersAndReloadPage() {
    this.closeRequestPreview();
    Requests.resetAllFilters();
    // since changes doesn't show up automatically
    // after updating request via API, reloading page is necessary
    cy.reload();
    cy.wait(2000);
    cy.expect(paneResultsSection.exists());
  },

  changeServicePoint: (servicePoint) => {
    cy.do(pickupServicePointSelect.choose(servicePoint));
    cy.wait(500);
  },

  verifyPatronCommentsFieldIsNotEditable: () => {
    cy.expect(patronComment.absent());
  },

  waitLoading: (type = 'title') => {
    cy.expect([
      requestDetailsSection.exists(),
      requesterInformation.exists(),
      requestInformation.exists(),
    ]);
    if (type === 'title') {
      cy.expect([titleInformation.exists()]);
    }
    if (type === 'item') {
      cy.expect([itemInformation.exists()]);
    }
  },

  verifyItemInformation(data) {
    InteractorsTools.checkKeyValue(itemInformation, 'Item barcode', data.itemBarcode);
    InteractorsTools.checkKeyValue(itemInformation, 'Effective location', data.effectiveLocation);
    InteractorsTools.checkKeyValue(itemInformation, 'Item status', data.itemStatus);
    InteractorsTools.checkKeyValue(itemInformation, 'Title', data.title);
    InteractorsTools.checkKeyValue(
      itemInformation,
      'Effective call number string',
      data.effectiveCallNumber,
    );
    InteractorsTools.checkKeyValue(itemInformation, 'Current due date', data.currentDueDate);
    InteractorsTools.checkKeyValue(itemInformation, 'Contributor', data.contributor);
    InteractorsTools.checkKeyValue(itemInformation, 'Requests on item', data.requestsOnItem);
  },

  verifyTitleInformation(data) {
    InteractorsTools.checkKeyValue(
      titleInformation,
      'Title level requests',
      data.titleLevelRequest,
    );
    InteractorsTools.checkKeyValue(titleInformation, 'Title', data.title);
  },

  verifyRequesterInformation(data) {
    InteractorsTools.checkKeyValue(
      requesterInformation,
      'Requester patron group',
      data.requesterPatronGroup,
    );
    cy.expect([
      requesterInformation.find(HTML(including('Requester'))).exists(),
      requesterInformation.find(Link(including(data.userFullName))).exists(),
      requesterInformation.find(Link(including(data.userBarcode))).exists(),
    ]);
  },

  verifyRequestInformation(data) {
    InteractorsTools.checkKeyValue(requestInformation, 'Request type', data.requestType);
    InteractorsTools.checkKeyValue(requestInformation, 'Request status', data.requestStatus);
    InteractorsTools.checkKeyValue(requestInformation, 'Patron comments', data.patronComments);
    InteractorsTools.checkKeyValue(
      requestInformation,
      'Hold shelf expiration date',
      data.holdShelfExpirationDate,
    );
    cy.expect([
      requestInformation.find(HTML(including('Request expiration date'))).exists(),
      requestInformation.find(HTML(including('Position in queue'))).exists(),
      requestInformation.find(HTML(including('Fulfillment preference'))).exists(),
      requestInformation.find(HTML(including('Pickup service point'))).exists(),
    ]);
  },

  setExpirationDate(value) {
    cy.do(requestExpirationDateInput.fillIn(value));
  },

  verifyFulfillmentPreferenceDropdown(value) {
    cy.get("select[name='fulfillmentPreference'] option:selected").should('have.value', value);
  },

  verifyServicePointDropdown(value) {
    cy.get("select[name='pickupServicePointId'] option:selected").should('have.value', value);
  },

  setPickupServicePoint(value) {
    cy.do(Select({ name: 'pickupServicePointId' }).choose(value));
  },
};
