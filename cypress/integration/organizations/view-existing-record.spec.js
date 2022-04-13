import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: View organization', () => {
  const organization = { ...newOrganization.defaultUiOrganizations };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.createOrganizationApi(organization);
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C672 View existing organization record', { tags: [TestType.smoke] }, () => {
    Organizations.selectActiveStatus();
    Organizations.checkOrganizationFilter();
    Organizations.chooseOrganizationFromList(organization);
    Organizations.expectcolorFromList();
    Organizations.checkOpenOrganizationInfo(organization);
  });
});
