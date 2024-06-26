import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-organizations: Creating organization', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    cy.visit(TopMenu.organizationsPath);
  });

  afterEach(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    'C675 Create new organization record (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft'] },
    () => {
      Organizations.createOrganizationViaUi(organization);
      Organizations.checkOrganizationInfo(organization);
    },
  );
});
