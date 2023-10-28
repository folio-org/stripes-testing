import { HTML, including } from '@interactors/html';
import ItemRecordView from '../inventory/item/itemRecordView';
import InteractorsTools from '../../utils/interactorsTools';
import {
  Pane,
  Section,
  Heading,
  KeyValue,
  Button,
  Accordion,
  MultiColumnListCell,
  Link,
} from '../../../../interactors';

const requestDetailsSection = Pane({ id: 'instance-details' });
const titleInformationSection = Section({ id: 'title-info' });
const itemInformationSection = Section({ id: 'item-info' });
const requestInfoSection = Section({ id: 'request-info' });
const requesterInfoSection = Section({ id: 'requester-info' });
const staffNotesInfoSection = Section({ id: 'staff-notes' });
const actionsButton = requestDetailsSection.find(Button('Actions'));
const moveRequestButton = Button('Move request');
const fulfillmentInProgressAccordion = Accordion({
  id: 'fulfillment-in-progress',
});

export default {
  waitLoading: () => {
    cy.expect([
      Pane({ id: 'instance-details', title: 'Request Detail' }).exists(),
      requestDetailsSection.find(titleInformationSection).exists(),
      requestDetailsSection.find(itemInformationSection).exists(),
      requestDetailsSection.find(requestInfoSection).exists(),
      requestDetailsSection.find(requesterInfoSection).exists(),
      requestDetailsSection.find(staffNotesInfoSection).exists(),
    ]);
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

  openMoveRequest() {
    cy.do(moveRequestButton.click());
  },

  verifyMoveRequestButtonExists() {
    cy.expect(moveRequestButton.exists());
  },

  requestQueueOnInstance(instanceTitle) {
    cy.do([actionsButton.click(), Button('Reorder queue').click()]);
    cy.expect(HTML(`Request queue on instance • ${instanceTitle} /.`).exists());
  },

  checkRequestMovedToFulfillmentInProgress(itemBarcode) {
    cy.expect(
      fulfillmentInProgressAccordion
        .find(MultiColumnListCell({ row: 0, content: itemBarcode }))
        .exists(),
    );
  },

  openItemByBarcode() {
    cy.do(itemInformationSection.find(Link()).click());
    ItemRecordView.waitLoading();
  },
};
