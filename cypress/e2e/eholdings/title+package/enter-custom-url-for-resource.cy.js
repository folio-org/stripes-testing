import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsResourceEdit,
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
      packageName: `C345387_package_${getRandomPostfix()}`,
      titleName: 'Journal of Fish Biology',
      customUrl: `https://custom-url-${getRandomPostfix()}.com`,
      updatedCustomUrl: `https://updated-custom-url-${getRandomPostfix()}.com`,
    };

    before('Create user, custom package and add title', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
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
          EHoldingsSearch.switchToTitles();
          EHoldingsTitlesSearch.byTitle(testData.titleName);
          EHoldingsTitlesSearch.openTitle(testData.titleName);
          EHoldingsTitle.waitLoading(testData.titleName);
          EHoldingsTitle.clickAddToCustomPackage();
          EHoldingsTitle.addTitleToCustomPackage(testData.packageName, testData.customUrl);

          EHoldingsResourceView.waitLoading();
          EHoldingsResourceView.checkNames(testData.packageName, testData.titleName);
        });
      });
    });

    after('Delete user and package', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testData.packageName, true);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C345387 Enter a custom URL for "eHoldings" Title+Package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345387'] },
      () => {
        EHoldingsResourceView.verifyCustomUrl(testData.customUrl);

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.verifyCustomUrlFilled(testData.customUrl);

        EHoldingsResourceEdit.fillInCustomUrl(testData.updatedCustomUrl);
        EHoldingsResourceEdit.verifyCustomUrlFilled(testData.updatedCustomUrl);

        EHoldingsResourceEdit.verifySaveButtonEnabled();
        EHoldingsResourceEdit.saveAndClose();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomUrl(testData.updatedCustomUrl);
      },
    );
  });
});
