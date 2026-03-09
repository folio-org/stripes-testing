import { Permissions } from '../../support/dictionary';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.specialOrganization,
    status: 'Pending',
    isVendor: false,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  [
    { filterActions: () => OrganizationsSearchAndFilter.filterByStatus('Pending') },
    { filterActions: () => OrganizationsSearchAndFilter.filterByCountry('United States') },
    { filterActions: () => OrganizationsSearchAndFilter.filterByLanguage('English') },
    { filterActions: () => OrganizationsSearchAndFilter.filterByPaymentMethod('Cash') },
  ].forEach((filter) => {
    it(
      'C6713 Test the Organizations app filters (except Tags) (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C6713'] },
      () => {
        filter.filterActions();
        OrganizationsSearchAndFilter.checkSearchAndFilterPaneExists();
        Organizations.selectOrganization(organization.name);
        Organizations.checkOrganizationInfo(organization);
        Organizations.closeDetailsPane();
        Organizations.resetFilters();
      },
    );
  });
});
