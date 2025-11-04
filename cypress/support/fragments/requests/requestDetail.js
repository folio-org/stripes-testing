import { HTML, including, TextField } from '@interactors/html';
import {
  Accordion,
  Button,
  Heading,
  KeyValue,
  Link,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  PaneContent,
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
const reorderQueueButton = Button('Reorder queue');
const editRequestButton = Button('Edit');
const fulfillmentInProgressAccordion = Accordion({
  id: 'fulfillment-in-progress',
});
const notYetFilledAccordion = Accordion({
  id: 'not-yet-filled',
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
      Pane({ id: 'instance-details', title: 'Request details' }).exists(),
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
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Title level requests',
      data.TLRs === '-' ? 'No value set-' : data.TLRs,
    );
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Title',
      data.title === '-' ? 'No value set-' : data.title,
    );
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Contributor',
      data.contributor === '-' ? 'No value set-' : data.contributor,
    );
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Publication date',
      data.publicationDate,
    );
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'Edition',
      data.edition === '-' ? 'No value set-' : data.edition,
    );
    InteractorsTools.checkKeyValue(
      titleInformationSection,
      'ISBN(s)',
      data.ISBNs === '-' ? 'No value set-' : data.ISBNs,
    );
  },

  checkItemStatus: (status) => {
    cy.wait(500);
    cy.expect(itemInformationSection.find(KeyValue('Item status', { value: status })).exists());
  },

  checkRequestStatus: (status) => {
    cy.expect(requestInfoSection.find(KeyValue('Request status', { value: status })).exists());
  },

  verifySectionsVisibility() {
    cy.expect([
      titleInformationSection.visible(),
      itemInformationSection.visible(),
      requestInfoSection.visible(),
      requesterInfoSection.visible(),
    ]);
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
    if (data.reason) InteractorsTools.checkKeyValue(requestInfoSection, 'Cancellation reason', data.reason);
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

  checkCreatedDate(date) {
    cy.do(Button(including('Record last updated')).click());
    cy.expect(requestInfoSection.find(HTML(including(`Record created: ${date}`))).exists());
  },

  openActions() {
    cy.wait(500);
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
    cy.do([actionsButton.click(), cy.wait(3000), cancelRequestButton.click()]);
  },

  verifyCancelRequestModalDisplayed() {
    cy.expect(confirmRequestCancellationModal.exists());
  },

  clickOnBackButton() {
    cy.do(Button('Back').click());
    cy.expect(confirmRequestCancellationModal.absent());
  },

  checkRequestCancellationModalInfo() {
    // cy.do(cancellationReasonSelect.choose('INN-Reach'));
    // cy.expect(additionalInfoOptionalInput.exists());
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
    cy.do([cancellationReasonSelect.choose('Patron Cancelled'), confirmButton.click()]);
  },

  confirmCancellation() {
    cy.do(confirmButton.click());
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
    cy.expect(editRequestButton.absent());
    this.openActions();
    cy.expect(editRequestButton.absent());
  },

  verifyActionButtonsPresence() {
    cy.expect([
      editRequestButton.visible(),
      cancelRequestButton.visible(),
      duplicateRequestButton.visible(),
      moveRequestButton.visible(),
      reorderQueueButton.visible(),
    ]);
  },

  requestQueueColumns: [
    {
      title: 'Order',
      id: 'position',
      columnIndex: 1,
    },
    {
      title: 'Status',
      id: 'fulfillmentstatus',
      columnIndex: 2,
    },
    {
      title: 'Item barcode',
      id: 'itembarcode',
      columnIndex: 3,
    },
    {
      title: 'Request date',
      id: 'requestdate',
      columnIndex: 4,
    },
    {
      title: 'Pickup/Delivery',
      id: 'pickupdelivery',
      columnIndex: 5,
    },
    {
      title: 'Requester',
      id: 'requester',
      columnIndex: 6,
    },
    {
      title: 'Requester barcode',
      id: 'requesterbarcode',
      columnIndex: 7,
    },
    {
      title: 'Patron group',
      id: 'patrongroup',
      columnIndex: 8,
    },
    {
      title: 'Type',
      id: 'requesttype',
      columnIndex: 9,
    },
    {
      title: 'Enumeration',
      id: 'enumeration',
      columnIndex: 10,
    },
    {
      title: 'Chronology',
      id: 'chronology',
      columnIndex: 11,
    },
    {
      title: 'Volume',
      id: 'volume',
      columnIndex: 12,
    },
    {
      title: 'Patron comments',
      id: 'patroncomments',
      columnIndex: 13,
    },
  ],

  verifyRequestQueueColumnsPresence(
    inProgressAccordionOption = true,
    notYetFilledAccordionOption = true,
  ) {
    if (inProgressAccordionOption) {
      this.requestQueueColumns.forEach(({ title }) => cy.expect(fulfillmentInProgressAccordion.find(MultiColumnListHeader(title)).exists()));
    }
    if (notYetFilledAccordionOption) {
      this.requestQueueColumns.splice(1, 1);
      this.requestQueueColumns.forEach(({ title }) => cy.expect(notYetFilledAccordion.find(MultiColumnListHeader(title)).exists()));
    }
  },

  openMoveRequest() {
    cy.do(moveRequestButton.click());
  },

  openDuplicateRequest() {
    cy.do(duplicateRequestButton.click());
  },

  clickReorderQueue() {
    cy.do(reorderQueueButton.click());
  },

  verifyMoveRequestButtonExists() {
    cy.expect(moveRequestButton.exists());
  },

  verifyQueueInstance(instanceTitle) {
    cy.expect(HTML(`Request queue on instance • ${instanceTitle} /.`).exists());
  },

  requestQueueOnInstance(instanceTitle) {
    cy.do([actionsButton.click(), reorderQueueButton.click()]);
    this.verifyQueueInstance(instanceTitle);
  },

  verifyAccordionsPresence(presence = true) {
    const visibilityOption = presence ? 'exists' : 'absent';
    cy.expect([
      fulfillmentInProgressAccordion[visibilityOption](),
      notYetFilledAccordion[visibilityOption](),
    ]);
  },

  checkRequestMovedToFulfillmentInProgress(itemBarcode, data = { moved: true, rowIndex: 0 }) {
    if (data.moved) {
      cy.expect(
        fulfillmentInProgressAccordion
          .find(MultiColumnListCell({ row: data.rowIndex, content: itemBarcode }))
          .exists(),
      );
    } else {
      cy.expect(
        fulfillmentInProgressAccordion
          .find(MultiColumnListCell({ row: data.rowIndex, content: itemBarcode }))
          .absent(),
      );
    }
  },

  clickBarcodeTitle(itemBarcode) {
    cy.do(
      fulfillmentInProgressAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 2 }))
        .find(Link(itemBarcode))
        .click(),
    );
  },

  verifyHeaders(instanceTitle) {
    cy.expect(HTML(`Request queue on instance • ${instanceTitle} /.`).exists());
    cy.expect(
      PaneContent({ id: 'request-queue-content' })
        .find(HTML(including(`Instance: ${instanceTitle} /.`)))
        .exists(),
    );
  },

  clickRequesterBarcode(itemBarcode) {
    cy.do(
      fulfillmentInProgressAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 7 }))
        .find(Link(itemBarcode))
        .click(),
    );
  },

  checkRequestIsNotYetFilled(itemBarcode, rowIndex = 0) {
    cy.expect(
      notYetFilledAccordion
        .find(MultiColumnListCell({ row: rowIndex, content: itemBarcode }))
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

  verifyPositionInQueue(value) {
    cy.expect(
      requestInfoSection.find(KeyValue('Position in queue')).has({ value: including(value) }),
    );
  },
  openRequesterByBarcode(barcode = '') {
    cy.do(requesterInfoSection.find(Link(including(barcode))).click());
  },
};
