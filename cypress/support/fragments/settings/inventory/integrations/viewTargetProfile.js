import { KeyValue } from '../../../../../../interactors';

export default {
  verifyTargetProfileForm(name, url, authentification, externalId, internalId) {
    cy.expect([
      KeyValue('Name').has({ value: name }),
      KeyValue('URL').has({ value: url }),
      KeyValue('Authentication').has({ value: authentification }),
      KeyValue('External ID query map').has({ value: externalId }),
      KeyValue('Internal ID embed path').has({ value: internalId }),
      KeyValue('Enabled').has({ value: '✓' }),
    ]);
  },
};
