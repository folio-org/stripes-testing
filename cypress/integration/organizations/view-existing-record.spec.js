import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: View organization', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    NewOrganization.createViaApi(organization);
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization[0].id);
      });
  });

  it('C672 View existing organization record', { tags: [TestType.smoke] }, () => {
    Organizations.selectActiveStatus();
    Organizations.checkOrganizationFilter();
    Organizations.chooseOrganizationFromList(organization);
    Organizations.expectColorFromList();
    Organizations.checkOpenOrganizationInfo(organization);
  });
});
