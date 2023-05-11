import { HTML, including } from '@interactors/html';
import {
  KeyValue,
  MultiColumnList,
  Section,
  MultiColumnListCell,
  Button,
  Accordion,
  Link,
  Pane
} from '../../../../interactors';

const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const catalogedDateKeyValue = KeyValue('Cataloged date');
const sourceKeyValue = KeyValue('Source');
const instanceStatusTermKeyValue = KeyValue('Instance status term');
const instanceDetailsNotesSection = Section({ id: 'instance-details-notes' });
const marcViewSection = Section({ id: 'marc-view-pane' });
const actionsButton = Button('Actions');
const viewSourceButton = Button('View source');
const instanceAdministrativeNote = MultiColumnList({ id: 'administrative-note-list' });
const instanceNote = MultiColumnList({ id: 'list-instance-notes-0' });

const verifyResourceTitle = value => {
  cy.expect(KeyValue('Resource title').has({ value }));
};

const verifyInstanceSource = (sourceValue) => cy.expect(sourceKeyValue.has({ value: sourceValue }));

const verifyInstanceStatusCode = value => {
  cy.expect(KeyValue('Instance status code').has({ value }));
};

const verifyResourceType = value => {
  cy.expect(KeyValue('Resource type term').has({ value }));
};

const verifyCatalogedDate = value => {
  cy.expect(catalogedDateKeyValue.has({ value }));
};

const verifyInstanceStatusTerm = value => {
  cy.expect(instanceStatusTermKeyValue.has({ value }));
};

const verifyMarkAsSuppressed = () => {
  cy.expect(instanceDetailsSection.find(HTML(including('Warning: Instance is marked staff suppressed'))).exists());
};

const verifyMarkAsSuppressedFromDiscovery = () => {
  cy.expect(instanceDetailsSection.find(HTML(including('Warning: Instance is marked suppressed from discovery'))).exists());
};

const verifyMarkAsSuppressedFromDiscoveryAndSuppressed = () => {
  cy.expect(instanceDetailsSection.find(HTML(including('Warning: Instance is marked suppressed from discovery and staff suppressed'))).exists());
};

const verifyGeneralNoteContent = (content) => {
  cy.expect(instanceDetailsNotesSection.find(HTML(including(content))).exists());
};

const verifySrsMarcRecord = () => {
  cy.expect(marcViewSection.exists());
};

const verifyImportedFieldExists = (field) => {
  cy.expect(marcViewSection.find(HTML(including(field))).exists());
};

const viewSource = () => cy.do([
  instanceDetailsSection.find(actionsButton).click(),
  viewSourceButton.click(),
]);

const verifyAdministrativeNote = (value) => {
  cy.expect(instanceAdministrativeNote.find(MultiColumnListCell({ content: value })).exists());
};

const verifyInstanceNote = (value) => {
  cy.expect(instanceNote.find(MultiColumnListCell({ content: value })).exists());
};

const verifyStatisticalCode = (value) => {
  cy.expect(MultiColumnList({ id: 'list-statistical-codes' }).find(MultiColumnListCell({ content: value })).exists());
};

const verifyNatureOfContent = (value) => {
  cy.expect(KeyValue('Nature of content').has({ value }));
};

const verifyInstanceRecordViewOpened = () => {
  cy.expect(Pane({ id:'pane-instancedetails' }).exists());
};

export default {
  verifyResourceTitle,
  verifyInstanceStatusCode,
  verifyResourceType,
  verifyCatalogedDate,
  verifyInstanceStatusTerm,
  verifyMarkAsSuppressed,
  verifyMarkAsSuppressedFromDiscovery,
  verifyMarkAsSuppressedFromDiscoveryAndSuppressed,
  verifyGeneralNoteContent,
  verifySrsMarcRecord,
  verifyImportedFieldExists,
  viewSource,
  verifyAdministrativeNote,
  verifyInstanceNote,
  verifyStatisticalCode,
  verifyNatureOfContent,
  verifyInstanceSource,
  verifyInstanceRecordViewOpened,
  verifyHotlinkToPOL:(number) => {
    cy.expect(Accordion('Acquisition').find(MultiColumnListCell({ row: 0, content: number })).exists());
    cy.expect(Accordion('Acquisition').find(Link({ href: including('/orders/lines/view') })).exists());
  },
  verifyIsHoldingsCreated:(...holdingToBeOpened) => {
    cy.expect(Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) }).exists());
  },

  openHoldingView: () => {
    cy.do(Button('View holdings').click());
    cy.expect(Button('Actions').exists());
  },

  verifyIsInstanceOpened:(title) => {
    cy.expect(Pane({ id:'pane-instancedetails' }).exists());
    cy.expect(Pane({ titleLabel: including(title) }).exists());
  },

  getAssignedHRID:() => cy.then(() => KeyValue('Instance HRID').value())
};
