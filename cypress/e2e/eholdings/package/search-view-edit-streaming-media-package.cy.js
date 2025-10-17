import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import {
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsPackage,
  EHoldingsSearch,
  EHoldingsNewCustomPackage,
} from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: `at_C350744_streamingMedia_${getRandomPostfix()}`,
      selectedStatus: 'Selected',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      contentType: 'Streaming Media',
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
      'C350744 Searching/Viewing/Editing Package with Streaming Media content type (eHoldings > Package)',
      { tags: ['extendedPath', 'spitfire', 'C350744'] },
      () => {
        EHoldingsSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);

        EHoldingsPackagesSearch.byContentType(testData.contentType);
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);

        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackages.verifyContentType(testData.contentType);

        EHoldingsPackage.verifySectionsToggle([
          'packageShowInformation',
          'packageShowHoldingStatus',
          'packageShowTags',
          'packageShowTitles',
        ]);

        EHoldingsPackage.editProxyActions();
        cy.wait(1000);
        EHoldingsPackages.fillDateCoverage(testData.startDate, testData.endDate);
        EHoldingsPackage.saveAndClose();
        EHoldingsNewCustomPackage.checkPackageUpdatedCallout();
        EHoldingsPackages.verifyContentType(testData.contentType);
      },
    );
  });
});
