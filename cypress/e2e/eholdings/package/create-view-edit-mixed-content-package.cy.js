import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import {
  EHoldingsPackages,
  EHoldingsPackage,
  EHoldingsSearch,
  EHoldingsNewCustomTitle,
  EHoldingsPackagesSearch,
} from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: `AT_C350745_mixedContent_${getRandomPostfix()}`,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      titleName: `AT_C350745_title_${getRandomPostfix()}`,
      contentType: 'Mixed Content',
    };

    before('Create user, package via API and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ])
        .then((user) => {
          testData.user = user;
          return EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: {
                name: testData.packageName,
                contentType: 'Mixed Content',
              },
            },
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsSearch.waitLoading,
          });
        });
    });

    after('Cleanup user and created data', () => {
      cy.getAdminToken().then(() => {
        EHoldingsPackages.deletePackageViaAPI(testData.packageName, true);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C350745 Create/View/Edit Mixed Content package and related title (eHoldings > Package)',
      { tags: ['extendedPath', 'spitfire', 'C350745'] },
      () => {
        EHoldingsSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackages.verifyContentType(testData.contentType);
        EHoldingsPackage.closePackage();

        EHoldingsSearch.switchToTitles();
        EHoldingsNewCustomTitle.createNewTitle();
        EHoldingsNewCustomTitle.waitLoading();

        EHoldingsNewCustomTitle.fillInRequiredProperties(testData.packageName, testData.titleName);
        EHoldingsNewCustomTitle.saveAndClose();
        EHoldingsNewCustomTitle.waitLoading();
        EHoldingsNewCustomTitle.close();

        EHoldingsSearch.waitLoading();
        EHoldingsSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackages.verifyContentType(testData.contentType);

        EHoldingsPackage.editProxyActions();
        cy.wait(1000);
        EHoldingsPackages.fillDateCoverage(testData.startDate, testData.endDate);
        EHoldingsPackage.saveAndClose();
        EHoldingsPackages.verifyContentType(testData.contentType);
      },
    );
  });
});
