import uuid from 'uuid';
import {
  Pane,
  including,
  Checkbox,
  MultiColumnListCell
} from '../../../interactors';

describe('Creating organization', () => {
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

  it('should be possible by filling the "Create organization" form and submitting it', function () {
    cy.visit('/organizations/create');

    cy.createOrganization({ name, code, status: 'Active' });
    cy.do(Checkbox({ id: 'clickable-filter-status-active' }).click());

    cy.expect(Pane(including(name)).is({ visible: true, index: 2 }));
    cy.expect(MultiColumnListCell({ content: name }).exists());
  });
});
