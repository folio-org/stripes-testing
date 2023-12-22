import { Permissions } from '../../support/dictionary';
import { EHoldingsSearch } from '../../support/fragments/eholdings';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('eHoldings', () => {
  const testData = {
    user: {},
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: `${TopMenu.eholdingsPath}?searchType=providers`,
        waiter: EHoldingsSearch.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C359011 "Filter by Tag" option doesn\'t show when user doesn\'t have related permissions (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // Verify that there are no "Tags" accordion button at the "Search & filter" pane.
      EHoldingsSearch.checkSearchPaneContent({
        filters: [{ label: 'Tags', visible: false }],
      });

      // Click on the "Packages" toggle at the "Search & filter" pane.
      EHoldingsSearch.switchToPackages();

      // Verify that there are no "Tags" accordion button at the "Search & filter" pane.
      EHoldingsSearch.checkSearchPaneContent({
        filters: [{ label: 'Tags', visible: false }],
      });

      // Click on the "Titles" toggle at the "Search & filter" pane.
      EHoldingsSearch.switchToTitles();

      // Verify that there are no "Tags" accordion button at the "Search & filter" pane.
      EHoldingsSearch.checkSearchPaneContent({
        filters: [{ label: 'Tags', visible: false }],
      });
    },
  );
});
