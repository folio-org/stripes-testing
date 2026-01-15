import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const resetFiltersMessage = 'Choose a filter or enter a search query to show results.';
  const organizations = [
    {
      ...newOrganization.defaultUiOrganizations,
      name: `Test Organization 1 ${Date.now()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...newOrganization.defaultUiOrganizations,
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
    cy.createTempUser([permissions.uiOrganizationsView.gui]).then((userProperties) => {
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
      Organizations.searchByParameters('Name', organizations[0].name);
      Organizations.selectOrganization(organizations[0].name);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
      Organizations.verifyNoResultMessage(resetFiltersMessage);
      Organizations.selectActiveStatus();
      Organizations.searchByParameters('Name', organizations[0].name);
      Organizations.checkSearchResults(organizations[0]);
      Organizations.selectOrganization(organizations[0].name);
      Organizations.checkOrganizationInfo(organizations[0]);
      Organizations.searchByParameters('Name', organizations[1].name);
      Organizations.checkSearchResults(organizations[1]);
      Organizations.selectOrganization(organizations[1].name);
      Organizations.checkOrganizationInfo(organizations[1]);
    },
  );
});
