import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsResourceView,
  EHoldingsSearch,
  EHoldingsTitle,
  EHoldingsTitlesSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: `C689_package_${getRandomPostfix()}`,
      titleName: 'Journal of Fish Biology',
      customUrl: `https://custom-url-${getRandomPostfix()}.com`,
    };

    before('Create user and custom package', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.packageName,
              contentType: 'E-Book',
            },
          },
        }).then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
      });
    });

    after('Delete user and package', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testData.packageName, true);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C689 Add a title to a custom package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C689'] },
      () => {
        EHoldingsSearch.switchToTitles();
        EHoldingsTitlesSearch.byTitle(testData.titleName);

        EHoldingsTitlesSearch.openTitle(testData.titleName);
        EHoldingsTitle.waitLoading(testData.titleName);

        EHoldingsTitle.verifyAddToCustomPackageButtonDisplayed();
        EHoldingsTitle.clickAddToCustomPackage();
        EHoldingsTitle.verifyAddTitleToCustomPackageModalView();

        EHoldingsTitle.openPackageDropdownInModal();
        EHoldingsTitle.verifyPackageDropdownExpanded();

        EHoldingsTitle.selectPackageInModal(testData.packageName);
        EHoldingsTitle.verifyPackageSelectedInModal(testData.packageName);

        EHoldingsTitle.fillInCustomUrl(testData.customUrl);
        EHoldingsTitle.verifyCustomUrlFilled(testData.customUrl);

        EHoldingsTitle.submitAddTitleToCustomPackageModal();
        EHoldingsTitle.verifyAddTitleToCustomPackageModalClosed();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.checkNames(testData.packageName, testData.titleName);
      },
    );
  });
});
