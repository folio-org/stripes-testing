import uuid from 'uuid';
import {
  Pane,
  including,
} from '../../../interactors';
import { testType } from '../../support/utils/tagTools';

describe('ui-organizations: Creating organization', () => {
  const name = 'Test-' + uuid();
  const code = 'Test-' + uuid();

  before(() => {
    cy.login('diku_admin', 'admin');
    cy.getToken('diku_admin', 'admin');
  });

  afterEach(() => {
    cy.getOrganizationsApi({ query: `name="${name}"` })
      .then(() => {
        Cypress.env('organizations').forEach(organization => {
          cy.deleteOrganizationApi(organization.id);
        });
      });
  });

  it('C675 should be possible by filling the "Create organization" form and submitting it', { tags: [testType.smoke] }, function () {
    cy.visit('/organizations/create');

    cy.createOrganization({ name, code, status: 'Active' });

    cy.expect(Pane(including(name)).is({ visible: true, index: 2 }));
  });
});
