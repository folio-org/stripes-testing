import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe(
  'Organizations',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };

    beforeEach(() => {
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
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
      { tags: ['smoke', 'thunderjet', 'C675'] },
      () => {
        Organizations.createOrganizationViaUi(organization);
        Organizations.checkOrganizationInfo(organization);
      },
    );
  },
);
