import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-organizations: Creating organization', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    cy.visit(TopMenu.organizationsPath);
  });

  afterEach(() => {
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    'C675 Create new organization record (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Organizations.createOrganizationViaUi(organization);
      Organizations.checkCreatedOrganization(organization);
    },
  );
});
