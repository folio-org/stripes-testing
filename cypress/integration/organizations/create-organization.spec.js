import getRandomPostfix from '../../../support/utils/stringTools';
import {
  Pane,
  including,
} from '../../../interactors';
import { testType } from '../../support/utils/tagTools';

describe('ui-organizations: Creating organization', () => {
  const name = 'orgName-' + getRandomPostfix();
  const code = 'orgCode-' + getRandomPostfix();

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
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
