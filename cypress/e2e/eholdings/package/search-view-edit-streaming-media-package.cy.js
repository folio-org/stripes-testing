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
  EHoldingsNewCustomPackage,
} from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Package', () => {
    describe('Edit Managed Package', () => {
      const testData = {
        packageName: `at_C350744_streamingMedia_${getRandomPostfix()}`,
        contentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.STREAMING_MEDIA,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      before('Create user and custom Streaming Media package', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.moduleeHoldingsEnabled.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uiTagsPermissionAll.gui,
        ])
          .then((user) => {
            testData.user = user;
            EHoldingsPackages.createPackageViaAPI({
              data: {
                type: 'packages',
                attributes: {
                  name: testData.packageName,
                  contentType: testData.contentType,
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

      after('Cleanup user and package', () => {
        cy.getAdminToken().then(() => {
          EHoldingsPackages.deletePackageViaAPI(testData.packageName, true);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C350744 Searching/Viewing/Editing "Package" with "Streaming Media" content type.',
        { tags: ['extendedPath', 'promin', 'C350744'] },
        () => {
          // Step 1: Switch to Packages tab
          EHoldingsSearch.switchToPackages();

          // Step 2: Search for the package by name
          EHoldingsPackagesSearch.byName(testData.packageName);

          // Step 3: Open Content type accordion; verify all content type options are listed
          EHoldingsPackagesSearch.verifyContentTypeOptions(
            Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES),
          );

          // Step 4: Select "Streaming Media" content type; results decrease
          EHoldingsPackagesSearch.selectContentType(testData.contentType);

          // Step 5: Open the package record (Selected status)
          EHoldingsPackages.openPackageWithExpectedName(testData.packageName);

          // Step 6: Verify Content type = "Streaming Media" in Package information
          EHoldingsPackages.verifyContentType(testData.contentType);

          // Step 7: Verify accordion buttons expand and collapse
          EHoldingsPackage.verifySectionsToggle([
            'packageShowInformation',
            'packageShowHoldingStatus',
            'packageShowTags',
            'packageShowTitles',
          ]);

          // Step 8: Open editing page via Actions > Edit
          EHoldingsPackage.editProxyActions();

          // Step 9: Change package settings and save; verify detail view with changes
          cy.wait(1000);
          EHoldingsPackages.fillDateCoverage(testData.startDate, testData.endDate);
          EHoldingsPackage.saveAndClose();
          EHoldingsNewCustomPackage.checkPackageUpdatedCallout();
          EHoldingsPackages.verifyContentType(testData.contentType);
        },
      );
    });
  });
});
