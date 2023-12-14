import { HTML, including, TextField } from '@interactors/html';
import {
  Accordion,
  Button,
  Heading,
  KeyValue,
  Link,
  Modal,
  MultiColumnListCell,
  Pane,
  Section,
  Select,
  TextArea,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import ItemRecordView from '../inventory/item/itemRecordView';

const requestDetailsSection = Pane({ id: 'instance-details' });
const titleInformationSection = Section({ id: 'title-info' });
const itemInformationSection = Section({ id: 'item-info' });
const requestInfoSection = Section({ id: 'request-info' });
const requesterInfoSection = Section({ id: 'requester-info' });
const staffNotesInfoSection = Section({ id: 'staff-notes' });
const actionsButton = requestDetailsSection.find(Button('Actions'));
const moveRequestButton = Button('Move request');
const duplicateRequestButton = Button('Duplicate');
const fulfillmentInProgressAccordion = Accordion({
  id: 'fulfillment-in-progress',
});
const cancelRequestButton = Button({ id: 'clickable-cancel-request' });
const confirmButton = Button('Confirm');
const confirmRequestCancellationModal = Modal('Confirm request cancellation');
const cancellationReasonSelect = Select({ dataTestID: 'selectCancelationReason' });
const additionalInfoOptionalInput = TextField('Additional information for patron');
const additionalInfoRequiredInput = TextField('Additional information for patron *');

const additionalInfoForCancellation = TextArea({ dataTestID: 'additionalInfo' });
const confirmCancellationButton = Button({ dataTestID: 'cancelRequestDialogCancel' });
const editButton = Button({ id: 'clickable-edit-request' });
const reorderQueueButton = Button({ id: 'reorder-queue' });

const availableOptions = {
  Edit: editButton,
  'Cancel request': cancelRequestButton,
  Duplicate: duplicateRequestButton,
  'Move request': moveRequestButton,
  'Reorder queue': reorderQueueButton,
};

export default {
  waitLoading: (type = 'staff') => {
    cy.expect([
      Pane({ id: 'instance-details', title: 'Request Detail' }).exists(),
      requestDetailsSection.find(titleInformationSection).exists(),
      requestDetailsSection.find(itemInformationSection).exists(),
      requestDetailsSection.find(requestInfoSection).exists(),
      requestDetailsSection.find(requesterInfoSection).exists(),
    ]);
    if (type === 'title') {
      cy.expect([requestDetailsSection.find(staffNotesInfoSection).exists()]);
    }
  },

  checkTitleInformation: (data) => {
    InteractorsTools.checkKeyValue(titleInformationSection, 'Title level requests', data.TLRs);
    InteractorsTools.checkKeyValue(titleInformationSection, 'Title', data.title);
    InteractorsTools.checkKeyValue(titleInformationSection, 'Contributor', data.contributor);
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Publication date',
      data.publicationDate,
    );
    InteractorsTools.checkKeyValue(titleInformationSection, 'Edition', data.edition);
    InteractorsTools.checkKeyValue(titleInformationSection, 'ISBN(s)', data.ISBNs);
  },

  checkItemStatus: (status) => {
    cy.expect(itemInformationSection.find(KeyValue('Item status', { value: status })).exists());
  },

  checkRequestStatus: (status) => {
    cy.expect(requestInfoSection.find(KeyValue('Request status', { value: status })).exists());
  },

  checkRequestsOnItem: (requests) => {
    cy.expect(
      itemInformationSection.find(KeyValue('Requests on item', { value: requests })).exists(),
    );
  },

  checkItemInformation: (data) => {
    if (data) {
      InteractorsTools.checkKeyValue(itemInformationSection, 'Item barcode', data.itemBarcode);
      InteractorsTools.checkKeyValue(itemInformationSection, 'Title', data.title);
      InteractorsTools.checkKeyValue(itemInformationSection, 'Contributor', data.contributor);
      InteractorsTools.checkKeyValue(
        itemInformationSection,
        'Effective location',
        data.effectiveLocation,
      );
      InteractorsTools.checkKeyValue(
        itemInformationSection,
        'Effective call number string',
        data.callNumber,
      );
      InteractorsTools.checkKeyValue(itemInformationSection, 'Item status', data.itemStatus);
      InteractorsTools.checkKeyValue(itemInformationSection, 'Current due date', data.dueDate);
      InteractorsTools.checkKeyValue(
        itemInformationSection,
        'Requests on item',
        data.requestsOnItem,
      );
    } else {
      itemInformationSection.find(
        HTML(including('There is no item information for this request.')),
      );
    }
  },

  checkRequestInformation: (data) => {
    InteractorsTools.checkKeyValue(requestInfoSection, 'Request type', data.type);
    InteractorsTools.checkKeyValue(requestInfoSection, 'Request status', data.status);
    InteractorsTools.checkKeyValue(
      requestInfoSection,
      'Request expiration date',
      data.requestExpirationDate,
    );
    InteractorsTools.checkKeyValue(
      requestInfoSection,
      'Hold shelf expiration date',
      data.holdShelfExpirationDate,
    );
    InteractorsTools.checkKeyValue(requestInfoSection, 'Position in queue', data.position);
    InteractorsTools.checkKeyValue(requestInfoSection, 'Request level', data.level);
    InteractorsTools.checkKeyValue(requestInfoSection, 'Patron comments', data.comments);
  },

  checkItemBarcode: (barcode) => {
    requesterInfoSection.find(KeyValue('Item barcode')).has({ value: barcode });
  },

  checkRequestsCount: (count) => {
    requesterInfoSection.find(KeyValue('Requests on item')).has({ value: count });
  },

  checkRequesterInformation: (data) => {
    cy.expect([
      requesterInfoSection.find(Heading('Requester')).exists(),
      requesterInfoSection.find(HTML(including(data.lastName))).exists(),
      requesterInfoSection.find(HTML(including(data.barcode))).exists(),
    ]);
    InteractorsTools.checkKeyValue(requesterInfoSection, 'Requester patron group', data.group);
    InteractorsTools.checkKeyValue(requesterInfoSection, 'Fulfillment preference', data.preference);
    InteractorsTools.checkKeyValue(requesterInfoSection, 'Pickup service point', data.pickupSP);
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  verifyActionsAvailableOptions(
    options = ['Edit', 'Cancel request', 'Duplicate', 'Move request', 'Reorder queue'],
  ) {
    cy.do(actionsButton.click());
    options.forEach((option) => {
      cy.expect(availableOptions[option].exists());
    });
    cy.do(actionsButton.click());
  },

  verifyCancelRequestOptionDisplayed() {
    cy.expect(cancelRequestButton.exists());
  },

  openCancelRequest() {
    cy.do(cancelRequestButton.click());
  },

  openCancelRequestForm() {
    cy.do([actionsButton.click(), cancelRequestButton.click()]);
  },

  verifyCancelRequestModalDisplayed() {
    cy.expect(confirmRequestCancellationModal.exists());
  },

  clickOnBackButton() {
    cy.do(Button('Back').click());
    cy.expect(confirmRequestCancellationModal.absent());
  },

  checkRequestCancellationModalInfo() {
    cy.do(cancellationReasonSelect.choose('INN-Reach'));
    cy.expect(additionalInfoOptionalInput.exists());
    cy.do(cancellationReasonSelect.choose('Item Not Available'));
    cy.expect(additionalInfoOptionalInput.exists());
    cy.do(cancellationReasonSelect.choose('Needed For Course Reserves'));
    cy.expect(additionalInfoOptionalInput.exists());
    cy.do(cancellationReasonSelect.choose('Patron Cancelled'));
    cy.expect(additionalInfoOptionalInput.exists());
    cy.do(cancellationReasonSelect.choose('Other'));
    cy.expect([additionalInfoRequiredInput.exists(), confirmButton.has({ disabled: true })]);
  },

  confirmRequestCancellation() {
    cy.do([cancellationReasonSelect.choose('INN-Reach'), confirmButton.click()]);
  },

  selectCancellationReason(reason) {
    cy.do(cancellationReasonSelect.choose(reason));
  },

  provideAdditionalInformationForCancelation(info) {
    cy.do(additionalInfoForCancellation.fillIn(info));
  },

  cancelRequest() {
    cy.do(confirmCancellationButton.click());
  },

  verifyEditButtonAbsent() {
    cy.expect(Button('Edit').absent());
    this.openActions();
    cy.expect(Button('Edit').absent());
  },

  openMoveRequest() {
    cy.do(moveRequestButton.click());
  },

  openDuplicateRequest() {
    cy.do(duplicateRequestButton.click());
  },

  verifyMoveRequestButtonExists() {
    cy.expect(moveRequestButton.exists());
  },

  requestQueueOnInstance(instanceTitle) {
    cy.do([actionsButton.click(), reorderQueueButton.click()]);
    cy.expect(HTML(`Request queue on instance • ${instanceTitle} /.`).exists());
  },

  checkRequestMovedToFulfillmentInProgress(itemBarcode) {
    cy.expect(
      fulfillmentInProgressAccordion
        .find(MultiColumnListCell({ row: 0, content: itemBarcode }))
        .exists(),
    );
  },

  openItemByBarcode(barcode = '') {
    cy.do(itemInformationSection.find(Link(including(barcode))).click());
    ItemRecordView.waitLoading();
  },

  viewRequestsInQueue() {
    cy.do(requestInfoSection.find(KeyValue('Position in queue').find(Link())).click());
  },
};
