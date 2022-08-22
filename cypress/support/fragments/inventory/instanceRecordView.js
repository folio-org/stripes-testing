import { HTML } from '@interactors/html';
import { including } from 'bigtest';
import { KeyValue, Section } from '../../../../interactors';

const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const catalogedDateKeyValue = KeyValue('Cataloged date');
const instanceStatusTermKeyValue = KeyValue('Instance status term');
const instanceDetailsNotesSection = Section({ id: 'instance-details-notes' });

const verifyResourceTitle = value => {
  cy.expect(KeyValue('Resource title').has({ value }));
};

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

const verifyGeneralNoteContent = (content) => {
  cy.expect(instanceDetailsNotesSection.find(HTML(including(content))).exists());
};
export default {
  verifyResourceTitle,
  verifyInstanceStatusCode,
  verifyResourceType,
  verifyCatalogedDate,
  verifyInstanceStatusTerm,
  verifyMarkAsSuppressed,
  verifyMarkAsSuppressedFromDiscovery,
  verifyGeneralNoteContent,
};
