import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', { retries: { runMode: 1 } }, () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
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
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C421981 Making existing Organization a Donor and vice versa (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addDonorToOrganization();
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByIsDonor('Yes');
      Organizations.selectOrganization(organization.name);
      Organizations.checkOrganizationInfo(organization);
      Organizations.editOrganization();
      Organizations.removeDonorFromOrganization();
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByIsDonor('No');
      Organizations.selectOrganization(organization.name);
      Organizations.checkOrganizationInfo(organization);
      Organizations.resetFilters();
    },
  );
});
