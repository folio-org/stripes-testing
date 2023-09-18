import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
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
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Deleting user, data', () => {
      Users.deleteViaApi(testData.userId);
    });

    it(
      'C683 Search packages for [JSTOR]. Filter results to only show selected packages (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.searchQuery);
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();
      },
    );
  });
});
