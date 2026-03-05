import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const resetFiltersMessage = 'Choose a filter or enter a search query to show results.';
  const organizations = [
    {
      ...NewOrganization.defaultUiOrganizations,
      name: `Test Organization 1 ${Date.now()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...NewOrganization.defaultUiOrganizations,
      name: `Test Organization 2 ${Date.now()}`,
      code: `${getRandomPostfix()}_2`,
    },
  ];

  before('Create user and organizations', () => {
    cy.getAdminToken();
    organizations.forEach((org) => {
      Organizations.createOrganizationViaApi(org).then((orgId) => {
        org.id = orgId;
      });
    });
    cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    organizations.forEach((org) => {
      Organizations.deleteOrganizationViaApi(org.id);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C451606 Correct page title when Organization details pane is opened (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C451606'] },
    () => {
      Organizations.verifyNoResultMessage(resetFiltersMessage);
      OrganizationsSearchAndFilter.searchByParameters('Name', organizations[0].name);
      Organizations.selectOrganization(organizations[0].name);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
      Organizations.verifyNoResultMessage(resetFiltersMessage);
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Active');
      OrganizationsSearchAndFilter.searchByParameters('Name', organizations[0].name);
      Organizations.checkSearchResults(organizations[0]);
      Organizations.selectOrganization(organizations[0].name);
      Organizations.checkOrganizationInfo(organizations[0]);
      OrganizationsSearchAndFilter.searchByParameters('Name', organizations[1].name);
      Organizations.checkSearchResults(organizations[1]);
      Organizations.selectOrganization(organizations[1].name);
      Organizations.checkOrganizationInfo(organizations[1]);
    },
  );
});
