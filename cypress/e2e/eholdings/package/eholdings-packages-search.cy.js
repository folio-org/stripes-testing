import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      searchQuery: 'JSTOR',
      selectedStatus: 'Selected',
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.waitForAuthRefresh(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
    });

    it(
      'C683 Search packages for [JSTOR]. Filter results to only show selected packages (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C683'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.searchQuery);
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();
      },
    );
  });
});
