import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: View organization', () => {
  const organization = { ...newOrganization.defaultUiOrganizations };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    Organizations.createOrganizationApi(organization)
      .then(response => {
        organization.id = response;
      });
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    Organizations.deleteOrganizationApi(organization.id);
  });

  it('C672 View existing organization record', { tags: [TestType.smoke] }, () => {
    Organizations.selectActiveStatus();
    Organizations.checkOrganizationFilter();
    Organizations.chooseOrganizationFromList(organization);
    Organizations.expectColorFromList();
    Organizations.checkOpenOrganizationInfo(organization);
  });
});
