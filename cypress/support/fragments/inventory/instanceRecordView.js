import { KeyValue } from '../../../../interactors';

const verifyResourceTitle = value => {
  cy.expect(KeyValue('Resource title').has({ value }));
};

const verifyInstanceStatusCode = value => {
  cy.expect(KeyValue('Instance status code').has({ value }));
};

const verifyResourceType = value => {
  cy.expect(KeyValue('Resource type term').has({ value }));
};

export default {
  verifyResourceTitle,
  verifyInstanceStatusCode,
  verifyResourceType,
};
