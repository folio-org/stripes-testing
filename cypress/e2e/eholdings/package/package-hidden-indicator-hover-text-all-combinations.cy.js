import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackage,
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsPackageView,
  EHoldingsSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { EHOLDINGS_PACKAGE_CONTENT_TYPES } from '../../../support/constants/constants';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: `AT_C1538637_Package_${getRandomPostfix()}`,
    };

    // Opens the package from the results list, edits it to the given exclusion-option
    // combination, saves, verifies the toast, and closes back to the results list
    const setExclusionOptionsAndClose = (options) => {
      EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
      EHoldingsPackageView.waitLoading();
      EHoldingsPackage.editProxyActions();
      EHoldingsPackageView.chooseExclusionOptions(options);
      EHoldingsPackageView.verifyExclusionOptions(options);
      EHoldingsPackage.saveAndClose();
      EHoldingsPackage.verifyPackageSaveCallout();
      EHoldingsPackageView.waitLoading();
      EHoldingsPackageView.close();
      EHoldingsPackages.verifyPackageExistsInResults(testData.packageName);
      // Per test case: "If the indicator is not immediately visible, reload the page"
      cy.wait(2000);
      cy.reload();
      EHoldingsPackages.waitLoading();
    };

    before('Create custom package and user', () => {
      cy.getAdminToken();
      EHoldingsPackages.deleteAllPackagesByNameViaAPI('AT_C1538637_*');
      EHoldingsPackages.createPackageViaAPI({
        data: {
          attributes: {
            name: testData.packageName,
            contentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
            url: 'https://c1538637-test.org',
          },
        },
      });

      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
        EHoldingsSearch.switchToPackages();
        EHoldingsPackages.waitLoading();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageExistsInResults(testData.packageName);
      });
    });

    after('Delete custom package and user', () => {
      cy.getAdminToken(false);
      EHoldingsPackages.deletePackageViaAPI(testData.packageName);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1538637 Package hidden indicator on search results list shows correct hover text for all hide/exclude option combinations (promin)',
      { tags: ['extendedPath', 'promin', 'C1538637'] },
      () => {
        // Step 1: no hidden indicator while all 3 options are unchecked
        EHoldingsPackages.verifyHiddenIndicatorShown(testData.packageName, false);

        // Steps 2-15: cycle through the combinations TestRail specifies, verifying the hidden
        // indicator and its tooltip text after each one
        const combinations = [
          { pf: true, ftf: false, marc: false },
          { pf: true, ftf: true, marc: false },
          { pf: true, ftf: true, marc: true },
          { pf: false, ftf: true, marc: true },
          { pf: false, ftf: false, marc: true },
          { pf: false, ftf: true, marc: false },
          { pf: true, ftf: false, marc: true },
        ];

        combinations.forEach((options) => {
          setExclusionOptionsAndClose(options);
          EHoldingsPackages.verifyHiddenIndicatorShown(testData.packageName, true);
          EHoldingsPackages.verifyHiddenIndicatorTooltipInResultRow({
            packageName: testData.packageName,
            ...options,
          });
        });

        // Step 16: unchecking all 3 options removes the hidden indicator again
        setExclusionOptionsAndClose({ pf: false, ftf: false, marc: false });
        EHoldingsPackages.verifyHiddenIndicatorShown(testData.packageName, false);
      },
    );
  });
});
