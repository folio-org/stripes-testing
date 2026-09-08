import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { EHOLDINGS_PACKAGE_CONTENT_TYPES } from '../../../support/constants/constants';
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
  describe('Title+Package', () => {
    const testData = {
      streamingPackageName: `AT_C350749_streaming_${getRandomPostfix()}`,
      mixedPackageName: `AT_C350749_mixed_${getRandomPostfix()}`,
      titleName1: `AT_C350749_Title_${getRandomPostfix()}`,
      titleName2: `AT_C350749_Title_${getRandomPostfix()}`,
      customLabelValue1: `value_C350749_${getRandomPostfix()}`,
      customLabelValue2: `value_C350749_${getRandomPostfix()}`,
      streamingContentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.STREAMING_MEDIA,
      mixedContentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.MIXED_CONTENT,
      customLabel1: null,
      customLabel2: null,
    };
    const titlesToCreate = [
      { package: testData.streamingPackageName, title: testData.titleName1 },
      { package: testData.mixedPackageName, title: testData.titleName2 },
    ];

    before('Creating user, packages via API, titles via UI', () => {
      cy.getAdminToken();
      cy.getEHoldingsCustomLabelsViaAPI().then((labels) => {
        testData.customLabel1 = labels[0].attributes.displayLabel;
        testData.customLabel2 = labels[1].attributes.displayLabel;
      });

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
      cy.getAdminToken(false).then(() => {
        EHoldingsPackages.deletePackageViaAPI(testData.streamingPackageName, true);
        EHoldingsPackages.deletePackageViaAPI(testData.mixedPackageName, true);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C350749 Editing Title+Package with "Mixed Content"/ "Streaming Media" content type (eHoldings > Title+Package)',
      { tags: ['extendedPath', 'promin', 'C350749'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });

        // Step 1: Switch to Packages tab
        EHoldingsSearch.switchToPackages();

        // Step 2: Open Content type accordion; verify all content type options are listed
        EHoldingsPackagesSearch.verifyContentTypeOptions(
          Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES),
        );

        // Step 3: Select "Streaming Media" content type
        EHoldingsPackagesSearch.selectContentType(testData.streamingContentType);

        // Step 4: Search for the Streaming Media package
        EHoldingsPackagesSearch.byName(testData.streamingPackageName);

        // Step 5: Open the package record
        EHoldingsPackages.openPackageWithExpectedTitels(1);

        // Step 6: Verify Content type value in Package information
        EHoldingsPackages.verifyContentType(testData.streamingContentType);

        // Step 7: Open the title from the Titles accordion
        EHoldingsPackage.openTitle(testData.titleName1);

        // Step 8: Verify Package content type in Resource information
        EHoldingsResourceView.verifyPackageContentType(testData.streamingContentType);

        // Step 9: Open title editing page via Actions > Edit
        EHoldingsTitle.editTitle();

        // Step 10: Edit a custom label value
        EHoldingsResourceEdit.fillCustomLabelValue(
          testData.customLabel1,
          testData.customLabelValue1,
        );

        // Step 11: Save & close; verify "Title was updated" toast
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();

        // Step 12: Verify custom label change is saved
        EHoldingsResourceView.verifyCustomLabelValue(
          testData.customLabel1,
          testData.customLabelValue1,
        );

        // Step 13: Close title detail view → close package detail view
        EHoldingsTitle.closeHoldingsTitleView();
        EHoldingsPackage.closePackage();

        // Step 14: Open Content type accordion again; verify all content type options are listed
        EHoldingsPackagesSearch.verifyContentTypeOptions(
          Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES),
        );

        // Step 15: Select "Mixed Content" content type
        EHoldingsPackagesSearch.selectContentType(testData.mixedContentType);

        // Step 16: Search for the Mixed Content package
        EHoldingsPackagesSearch.byName(testData.mixedPackageName);

        // Step 17: Repeat steps 5-12 for Mixed Content package
        EHoldingsPackages.openPackageWithExpectedTitels(1);
        EHoldingsPackages.verifyContentType(testData.mixedContentType);
        EHoldingsPackage.openTitle(testData.titleName2);
        EHoldingsResourceView.verifyPackageContentType(testData.mixedContentType);
        EHoldingsTitle.editTitle();
        EHoldingsResourceEdit.fillCustomLabelValue(
          testData.customLabel2,
          testData.customLabelValue2,
        );
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomLabelValue(
          testData.customLabel2,
          testData.customLabelValue2,
        );
      },
    );
  });
});
