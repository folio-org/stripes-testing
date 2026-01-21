import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('Organizations', () => {
  const orgA = {
    ...NewOrganization.defaultUiOrganizations,
    name: `Org A ${getRandomPostfix()}`,
    status: 'Active',
    code: `ORG-A-${getRandomPostfix()}`,
  };
  const orgB = {
    ...NewOrganization.defaultUiOrganizations,
    name: `Org B ${getRandomPostfix()}`,
    status: 'Inactive',
    code: `ORG-B-${getRandomPostfix()}`,
  };
  const orgC = {
    ...NewOrganization.defaultUiOrganizations,
    name: `Org C ${getRandomPostfix()}`,
    status: 'Pending',
    code: `ORG-C-${getRandomPostfix()}`,
  };
  let user;

  before('Create user and organizations', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(orgA).then((response) => {
      orgA.id = response;
    });
    Organizations.createOrganizationViaApi(orgB).then((response) => {
      orgB.id = response;
    });
    Organizations.createOrganizationViaApi(orgC).then((response) => {
      orgC.id = response;
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
    Organizations.deleteOrganizationViaApi(orgA.id);
    Organizations.deleteOrganizationViaApi(orgB.id);
    Organizations.deleteOrganizationViaApi(orgC.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C728 Filter organizations by status (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C728'] },
    () => {
      // Step 1: Expand "Organizations status" accordion
      Organizations.selectActiveStatus();
      Organizations.organizationIsAbsent(orgB.name);
      Organizations.organizationIsAbsent(orgC.name);
      Organizations.searchByParameters('Name', orgA.name);
      Organizations.checkSearchResults(orgA);

      // Step 3: Filter by "Inactive" status
      Organizations.resetFilters();
      Organizations.selectInactiveStatus();
      Organizations.checkSearchResults(orgB);
      Organizations.organizationIsAbsent(orgA.name);
      Organizations.organizationIsAbsent(orgC.name);

      // Step 4: Filter by "Pending" status
      Organizations.resetFilters();
      Organizations.selectPendingStatus();
      Organizations.checkSearchResults(orgC);
      Organizations.organizationIsAbsent(orgA.name);
      Organizations.organizationIsAbsent(orgB.name);

      // Step 5: Filter by "Active" and "Pending" statuses
      Organizations.selectActiveStatus();
      Organizations.organizationIsAbsent(orgB.name);
      Organizations.searchByParameters('Name', orgC.name);
      Organizations.checkSearchResults(orgC);
      Organizations.searchByParameters('Name', orgA.name);
      Organizations.checkSearchResults(orgA);

      // Step 6: Filter by all statuses
      Organizations.selectInactiveStatus();
      Organizations.checkSearchResults(orgA);
      Organizations.searchByParameters('Name', orgB.name);
      Organizations.checkSearchResults(orgB);
      Organizations.searchByParameters('Name', orgC.name);
      Organizations.checkSearchResults(orgC);

      // Step 7: Filter by "Inactive" and "Pending" statuses
      Organizations.resetFilters();
      Organizations.selectInactiveStatus();
      Organizations.selectPendingStatus();
      Organizations.checkSearchResults(orgB);
      Organizations.checkSearchResults(orgC);
      Organizations.organizationIsAbsent(orgA.name);
    },
  );
});
