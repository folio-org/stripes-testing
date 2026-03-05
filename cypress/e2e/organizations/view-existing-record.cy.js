import Organizations from '../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    name: `1_autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });

    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C672 View existing organization record (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C672'] },
    () => {
      OrganizationsSearchAndFilter.waitLoading();
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Active');
      OrganizationsSearchAndFilter.checkSearchAndFilterPaneExists();
      Organizations.selectOrganization(organization.name);
      Organizations.checkOrganizationInfo(organization);
    },
  );
});
