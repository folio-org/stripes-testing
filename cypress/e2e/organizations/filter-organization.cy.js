import {
  COMMON_BUTTON_LABELS,
  ORGANIZATION_FILTER_LABELS,
  ORGANIZATION_SEARCH_OPTIONS,
  ORGANIZATION_STATUSES,
} from '../../support/constants';
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
    {
      name: ORGANIZATION_FILTER_LABELS.ORGANIZATIONS_STATUS,
      filterActions: () => OrganizationsSearchAndFilter.filterByOrganizationStatus(ORGANIZATION_STATUSES.PENDING),
    },
    {
      name: ORGANIZATION_FILTER_LABELS.IS_DONOR,
      filterActions: () => OrganizationsSearchAndFilter.filterByIsDonor(COMMON_BUTTON_LABELS.NO),
    },
    {
      name: ORGANIZATION_FILTER_LABELS.IS_VENDOR,
      filterActions: () => OrganizationsSearchAndFilter.filterByIsVendor(COMMON_BUTTON_LABELS.NO),
    },
    {
      name: ORGANIZATION_FILTER_LABELS.COUNTRY,
      filterActions: () => OrganizationsSearchAndFilter.filterByCountry('United States'),
    },
    {
      name: ORGANIZATION_FILTER_LABELS.LANGUAGE,
      filterActions: () => OrganizationsSearchAndFilter.filterByLanguage('English'),
    },
    {
      name: ORGANIZATION_FILTER_LABELS.PAYMENT_METHOD,
      filterActions: () => OrganizationsSearchAndFilter.filterByPaymentMethod('Cash'),
    },
  ].forEach((filter) => {
    it(
      `C6713 Test the Organizations app filters (except Tags): ${filter.name} (thunderjet)`,
      { tags: ['smoke', 'thunderjet', 'C6713'] },
      () => {
        // Search by organization name to verify that the filter works correctly
        // This should return only one organization in the search results - pagination safe
        OrganizationsSearchAndFilter.searchByParameters(
          ORGANIZATION_SEARCH_OPTIONS.NAME,
          organization.name,
        );
        OrganizationsSearchAndFilter.waitLoading();

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
