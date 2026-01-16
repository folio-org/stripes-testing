import { Permissions } from '../../support/dictionary';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const testData = {
    organizations: [
      NewOrganization.getDefaultOrganization(),
      NewOrganization.getDefaultOrganization(),
    ],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      testData.organizations.forEach((organization) => {
        Organizations.createOrganizationViaApi(organization);
      });
    });

    cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      testData.organizations.forEach((organization) => {
        Organizations.deleteOrganizationViaApi(organization.id);
      });
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C369086 Organizations | Results List | Verify that value in "Name" column is hyperlink (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C369086'] },
    () => {
      // Check "Active" checkbox in "Organizations status" accordion on "Search & filter" pane
      Organizations.selectActiveStatus();

      testData.organizations.forEach((organization) => {
        // Search for organizations from Preconditions
        Organizations.searchByParameters('Name', organization.name);
        Organizations.checkSearchResults(organization);

        // Click on the hyperlink in "Name" column
        Organizations.selectOrganization(organization.name);
        Organizations.checkOrganizationInfo(organization);
      });
    },
  );
});
