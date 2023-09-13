import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-organizations: View organization', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C672 View existing organization record (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Organizations.selectActiveStatus();
      Organizations.checkOrganizationFilter();
      Organizations.selectOrganization(organization.name);
      Organizations.checkOpenOrganizationInfo(organization);
    },
  );
});
