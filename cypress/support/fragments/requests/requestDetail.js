import { HTML, including } from '@interactors/html';
import { Pane, Section, Heading, KeyValue } from '../../../../interactors';

const requestDetailsSection = Pane({ id: 'instance-details' });
const titleInformationSection = Section({ id: 'title-info' });
const itemInformationSection = Section({ id: 'item-info' });
const requestInfoSection = Section({ id: 'request-info' });
const requesterInfoSection = Section({ id: 'requester-info' });
const staffNotesInfoSection = Section({ id: 'staff-notes' });

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
    cy.expect([
      itemInformationSection.find(KeyValue('Item barcode', { value: data.itemBarcode })).exists(),
      itemInformationSection.find(KeyValue('Title', { value: data.title })).exists(),
    ]);
  },

  checkRequesInformation: (data) => {
    cy.expect([
      requestInfoSection.find(KeyValue('Request type', { value: data.type })).exists(),
      requestInfoSection.find(KeyValue('Request status', { value: including(data.status) })).exists(),
      requestInfoSection.find(KeyValue('Request level', { value: data.level })).exists(),
    ]);
  },

  checkRequesterInformation: (data) => {
    cy.expect([
      requesterInfoSection.find(Heading('Requester')).exists(),
      requesterInfoSection.find(HTML(including(data.lastName))).exists(),
      requesterInfoSection.find(HTML(including(data.barcode))).exists(),
      requesterInfoSection.find(KeyValue('Requester patron group', { value: data.group })).exists(),
      requesterInfoSection.find(KeyValue('Fulfillment preference', { value: data.preference })).exists(),
      requesterInfoSection.find(KeyValue('Pickup service point', { value: data.pickupSP })).exists(),
    ]);
  },
};
