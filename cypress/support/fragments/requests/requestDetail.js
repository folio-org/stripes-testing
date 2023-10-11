import { HTML, including } from '@interactors/html';
import {
  Pane,
  Section,
  Heading,
  KeyValue,
  Button,
  Accordion,
  MultiColumnListCell,
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
    cy.expect([
      titleInformationSection.find(KeyValue('Title level requests', { value: data.TLRs })).exists(),
      titleInformationSection.find(KeyValue('Title', { value: data.title })).exists(),
    ]);
  },

  checkItemInformation: (data) => {
    if (data) {
      cy.expect([
        itemInformationSection.find(KeyValue('Item barcode', { value: data.itemBarcode })).exists(),
        itemInformationSection.find(KeyValue('Title', { value: data.title })).exists(),
        itemInformationSection
          .find(KeyValue('Effective location', { value: data.effectiveLocation }))
          .exists(),
        itemInformationSection.find(KeyValue('Item status', { value: data.itemStatus })).exists(),
        itemInformationSection
          .find(KeyValue('Requests on item', { value: data.requestsOnItem }))
          .exists(),
      ]);
    } else {
      itemInformationSection.find(
        HTML(including('There is no item information for this request.')),
      );
    }
  },

  checkRequestInformation: (data) => {
    cy.expect([
      requestInfoSection.find(KeyValue('Request type', { value: data.type })).exists(),
      requestInfoSection
        .find(KeyValue('Request status', { value: including(data.status) }))
        .exists(),
      requestInfoSection.find(KeyValue('Request level', { value: data.level })).exists(),
    ]);
  },

  checkRequesterInformation: (data) => {
    cy.expect([
      requesterInfoSection.find(Heading('Requester')).exists(),
      requesterInfoSection.find(HTML(including(data.lastName))).exists(),
      requesterInfoSection.find(HTML(including(data.barcode))).exists(),
      requesterInfoSection.find(KeyValue('Requester patron group', { value: data.group })).exists(),
      requesterInfoSection
        .find(KeyValue('Fulfillment preference', { value: data.preference }))
        .exists(),
      requesterInfoSection
        .find(KeyValue('Pickup service point', { value: data.pickupSP }))
        .exists(),
    ]);
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  openMoveRequest() {
    cy.do(moveRequestButton.click());
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
};
