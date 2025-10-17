import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import {
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsPackage,
  EHoldingsSearch,
  EHoldingsNewCustomTitle,
  EHoldingsResourceView,
  EHoldingsTitle,
  EHoldingsResourceEdit,
} from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      streamingPackageName: `AT_C350749_streaming_${getRandomPostfix()}`,
      mixedPackageName: `AT_C350749_mixed_${getRandomPostfix()}`,
      titleName1: `AT_C350749_Title_${getRandomPostfix()}`,
      titleName2: `AT_C350749_Title_${getRandomPostfix()}`,
      customLabelValue1: `value_C350749_${getRandomPostfix()}`,
      customLabelValue2: `value_C350749_${getRandomPostfix()}`,
      streamingContentType: 'Streaming Media',
      mixedContentType: 'Mixed Content',
    };
    const titlesToCreate = [
      { package: testData.streamingPackageName, title: testData.titleName1 },
      { package: testData.mixedPackageName, title: testData.titleName2 },
    ];
    const packageTitlePairs = [
      {
        packageName: testData.streamingPackageName,
        contentType: testData.streamingContentType,
        title: testData.titleName1,
        customLabel: 'A',
        customValue: testData.customLabelValue1,
      },
      {
        packageName: testData.mixedPackageName,
        contentType: testData.mixedContentType,
        title: testData.titleName2,
        customLabel: 'B',
        customValue: testData.customLabelValue2,
      },
    ];

    before('Creating user, packages via API, titles via UI and logging in', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      ])
        .then((user) => {
          testData.user = user;
          EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: {
                name: testData.streamingPackageName,
                contentType: testData.streamingContentType,
              },
            },
          });
        })
        .then(() => {
          EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: {
                name: testData.mixedPackageName,
                contentType: testData.mixedContentType,
              },
            },
          });
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsSearch.waitLoading,
          });
        })
        .then(() => {
          EHoldingsSearch.switchToTitles();
          titlesToCreate.forEach((option) => {
            EHoldingsNewCustomTitle.createNewTitle();
            EHoldingsNewCustomTitle.waitLoading();
            EHoldingsNewCustomTitle.fillInRequiredProperties(option.package, option.title);
            EHoldingsNewCustomTitle.saveAndClose();
            EHoldingsNewCustomTitle.checkCreationOfNewCustomTitle();
            EHoldingsNewCustomTitle.close();
            EHoldingsSearch.waitLoading();
          });
        });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken().then(() => {
        EHoldingsPackages.deletePackageViaAPI(testData.streamingPackageName, true);
        EHoldingsPackages.deletePackageViaAPI(testData.mixedPackageName, true);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C350749 Edit title custom label for Streaming Media then Mixed Content package (eHoldings > Package)',
      { tags: ['extendedPath', 'spitfire', 'C350749'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });

        EHoldingsSearch.switchToPackages();
        packageTitlePairs.forEach(
          ({ packageName, contentType, title, customLabel, customValue }) => {
            EHoldingsPackagesSearch.byName(packageName);
            cy.wait(2000);
            EHoldingsPackages.openPackageWithExpectedTitels(1);
            EHoldingsPackages.verifyContentType(contentType);
            cy.wait(2000);
            EHoldingsPackage.openTitle(title);
            EHoldingsTitle.editTitle();
            EHoldingsResourceEdit.fillCustomLabelValue(customLabel, customValue);
            EHoldingsResourceEdit.saveAndClose();
            cy.wait(2000);
            EHoldingsResourceView.verifyCustomLabelValue(customLabel, customValue);
            cy.visit(TopMenu.eholdingsPath);
            EHoldingsSearch.waitLoading();
            EHoldingsSearch.switchToPackages();
          },
        );
      },
    );
  });
});
