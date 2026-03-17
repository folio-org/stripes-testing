import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

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
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Active');
      Organizations.organizationIsAbsent(orgB.name);
      Organizations.organizationIsAbsent(orgC.name);
      OrganizationsSearchAndFilter.searchByParameters('Name', orgA.name);
      Organizations.checkSearchResults(orgA);

      // Step 3: Filter by "Inactive" status
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Inactive');
      Organizations.checkSearchResults(orgB);
      Organizations.organizationIsAbsent(orgA.name);
      Organizations.organizationIsAbsent(orgC.name);

      // Step 4: Filter by "Pending" status
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Pending');
      Organizations.checkSearchResults(orgC);
      Organizations.organizationIsAbsent(orgA.name);
      Organizations.organizationIsAbsent(orgB.name);

      // Step 5: Filter by "Active" and "Pending" statuses
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Active');
      Organizations.organizationIsAbsent(orgB.name);
      OrganizationsSearchAndFilter.searchByParameters('Name', orgC.name);
      Organizations.checkSearchResults(orgC);
      OrganizationsSearchAndFilter.searchByParameters('Name', orgA.name);
      Organizations.checkSearchResults(orgA);

      // Step 6: Filter by all statuses
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Inactive');
      Organizations.checkSearchResults(orgA);
      OrganizationsSearchAndFilter.searchByParameters('Name', orgB.name);
      Organizations.checkSearchResults(orgB);
      OrganizationsSearchAndFilter.searchByParameters('Name', orgC.name);
      Organizations.checkSearchResults(orgC);

      // Step 7: Filter by "Inactive" and "Pending" statuses
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Inactive');
      OrganizationsSearchAndFilter.filterByOrganizationStatus('Pending');
      Organizations.checkSearchResults(orgB);
      Organizations.checkSearchResults(orgC);
      Organizations.organizationIsAbsent(orgA.name);
    },
  );
});
