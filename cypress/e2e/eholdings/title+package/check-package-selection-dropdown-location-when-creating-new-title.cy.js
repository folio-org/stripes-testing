import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsNewCustomTitle,
  EHoldingsPackages,
  EHoldingsSearch,
  EHoldingsTitlesSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: `C421989_package_${getRandomPostfix()}`,
      titleName: `C421989_title_${getRandomPostfix()}`,
    };

    before('Create user and package', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
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
      'C421989 Check package selection dropdown location when creating new title (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C421989'] },
      () => {
        EHoldingsSearch.switchToTitles();
        EHoldingsNewCustomTitle.createNewTitle();
        EHoldingsNewCustomTitle.waitLoading();

        EHoldingsNewCustomTitle.fillInTitleName(testData.titleName);

        EHoldingsNewCustomTitle.openPackageDropdown();
        EHoldingsNewCustomTitle.verifyPackageDropdownExpanded();

        EHoldingsNewCustomTitle.selectPackage(testData.packageName);
        EHoldingsNewCustomTitle.verifyPackageSelected(testData.packageName);

        EHoldingsNewCustomTitle.saveAndClose();

        EHoldingsNewCustomTitle.checkCreationOfNewCustomTitle();
      },
    );
  });
});
