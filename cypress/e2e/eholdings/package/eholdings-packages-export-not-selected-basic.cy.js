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
      packageData: `C356418_package_data_${getRandomPostfix()}.csv`,
      titleData: `C356418_title_data_${getRandomPostfix()}.csv`,
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

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
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C356418 Export all not selected titles in a "Package". Export all "Package" and "Titles" fields selected by default settings (promin)',
      { tags: ['extendedPath', 'promin', 'C356418'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName('EBSCO');
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Not selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.package.status);

        // Step 5: View "Package" record with "Total titles" value more than 100
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

          // Step 6: Actions > "Export package (CSV)" - verify the "Export settings" modal content
          EHoldingsPackageView.openExportModal();
          ExportSettingsModal.verifyModalView();

          // Step 7: click "Export" (default "All" fields settings kept) - success toast shown
          ExportSettingsModal.clickExportButton();
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

          EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
            // Step 8: Export manager - verify the job row (Job ID, Status, Job type, Source)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByEHoldings();

            // Step 9: download the exported ".csv" file, verify its name format
            ExportManagerSearchPane.exportJobRecursively({ jobId });
            ExportManagerSearchPane.verifyJobDataInResults([
              jobId,
              'Successful',
              'eHoldings',
              testData.user.username,
            ]);
            ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

            FileManager.verifyFile(
              ExportManagerSearchPane.verifyExportedFileName,
              testData.fileMask,
              ExportManagerSearchPane.verifyContentOfExportFile,
              [testData.package.name],
            );

            // Step 10: "Package" row (1st row) - known values, all default fields are present
            FileManager.writeToSeparateFile({
              readFileName: testData.fileMask,
              writeFileName: testData.packageData,
              lines: [0, 2],
            });
            FileManager.convertCsvToJson(testData.packageData).then((data) => {
              cy.expect(data[0]['Package Name']).to.equal(testData.package.name);
              cy.expect(data[0]['Package Holdings Status']).to.equal(testData.package.status);
              const missingPackageHeaders = EHOLDINGS_PACKAGE_HEADERS.filter(
                (header) => !(header in data[0]),
              );
              expect(missingPackageHeaders, 'Missing Package CSV columns').to.have.length(0);
            });

            // Step 10: "Title" rows (starting 4th row) - row count matches the package's total
            // titles from step 5, and all default Title fields are present
            FileManager.writeToSeparateFile({
              readFileName: testData.fileMask,
              writeFileName: testData.titleData,
              lines: [2],
            });
            FileManager.convertCsvToJson(testData.titleData).then((data) => {
              cy.expect(data.length).to.equal(testData.package.titles);
              const missingTitleHeaders = EHOLDINGS_TITLE_HEADERS.filter(
                (header) => !(header in data[0]),
              );
              expect(missingTitleHeaders, 'Missing Title CSV columns').to.have.length(0);
            });
          });
        });
      },
    );
  });
});
