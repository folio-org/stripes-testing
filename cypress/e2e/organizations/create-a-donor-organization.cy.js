import Permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    name: `AT_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `AT_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    'C421980 Create a donor Organization (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C421980'] },
    () => {
      Organizations.createDonorOrganization(organization);
      Organizations.closeDetailsPane();
      OrganizationsSearchAndFilter.filterByIsDonor('Yes');
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.checkOrganizationInfo(organization);
      Organizations.closeDetailsPane();
      OrganizationsSearchAndFilter.resetFiltersIfActive();
      OrganizationsSearchAndFilter.filterByIsDonor('No');
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.organizationIsAbsent(organization.name);
    },
  );
});
