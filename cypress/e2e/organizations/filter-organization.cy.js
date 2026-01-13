import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import { Permissions } from '../../support/dictionary';
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
    { filterActions: Organizations.selectPendingStatus },
    { filterActions: Organizations.selectNoInIsVendor },
    { filterActions: () => Organizations.selectCountryFilter('United States') },
    { filterActions: Organizations.selectLanguageFilter },
    { filterActions: Organizations.selectCashInPaymentMethod },
  ].forEach((filter) => {
    it(
      'C6713 Test the Organizations app filters (except Tags) (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C6713'] },
      () => {
        filter.filterActions();
        Organizations.checkOrganizationFilter();
        Organizations.selectOrganization(organization.name);
        Organizations.checkOrganizationInfo(organization);
        Organizations.closeDetailsPane();
        Organizations.resetFilters();
      },
    );
  });
});
