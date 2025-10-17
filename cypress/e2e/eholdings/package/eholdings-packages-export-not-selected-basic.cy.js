import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackageView,
  EHoldingsPackages,
  EHoldingsPackagesSearch,
} from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
} from '../../../support/constants';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      package: {
        status: 'Not selected',
      },
      user: {},
      fileName: `C356418autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: `${TopMenu.eholdingsPath}?searchType=packages`,
          waiter: EHoldingsPackages.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
        FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C356418 Export all not selected titles in a "Package". Export all "Package" and "Titles" fields selected by default settings (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356418'] },
      () => {
        EHoldingsPackagesSearch.byName('EBSCO');
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        EHoldingsPackagesSearch.bySelectionStatus(testData.package.status);
        EHoldingsPackages.sortPackagesByTitlesCount().then((packages) => {
          const chosen = packages[0];
          testData.package.id = chosen.id;
          testData.package.name = chosen.name;
          testData.package.titles = chosen.countTotalTitles;

          EHoldingsPackages.openPackageWithExpectedName(testData.package.name);
          EHoldingsPackageView.verifyPackageDetailViewIsOpened(
            testData.package.name,
            testData.package.titles,
            testData.package.status,
          );
          EHoldingsPackageView.openExportModal();
          ExportSettingsModal.clickExportButton();

          EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByEHoldings();
            ExportManagerSearchPane.verifyResult(jobId);
            ExportManagerSearchPane.exportJobRecursively({ jobId });
            ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

            const expectedTokens = [
              ...EHOLDINGS_PACKAGE_HEADERS,
              ...EHOLDINGS_TITLE_HEADERS,
              testData.package.name,
            ];

            FileManager.verifyFile(
              ExportManagerSearchPane.verifyExportedFileName,
              testData.fileMask,
              ExportManagerSearchPane.verifyContentOfExportFile,
              expectedTokens,
            );
          });
        });
      },
    );
  });
});
