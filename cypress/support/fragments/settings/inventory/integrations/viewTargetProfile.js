import { KeyValue, Button } from '../../../../../../interactors';

export default {
  edit: () => cy.do(Button('Edit').click()),
  getAuthentication: () => cy.then(() => KeyValue('Authentication').value()),
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
