import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

const selectedPackageHeaderTokens = ['Package Holdings Status', 'Package Note'];

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'E-Journal',
      selectedStatus: 'Selected',
      titlesNumber: 0,
      firstFieldForExport: 'Holdings status',
      secondFieldForExport: 'Notes',
      fileName: `C356417autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      packageData: `C356417_package_data_${getRandomPostfix()}.csv`,
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Creating user, logging in', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingSearch.switchToPackages();
        cy.wait(10000);
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
      FileManager.deleteFileFromDownloadsByMask(testData.packageData);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356417 Export of selected “Package” without titles. User chooses "Package" fields to export. (promin)',
      { tags: ['extendedPath', 'promin', 'C356417'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        // Step 5: View "Package" record with "Total titles" value = 0
        EHoldingsPackages.openPackageWithExpectedTitels(testData.titlesNumber);
        EHoldingsPackageView.verifyPackageDetailViewIsOpened(
          testData.packageName,
          testData.titlesNumber,
          testData.selectedStatus,
        );

        // Step 6: Actions > "Export package (CSV)" - verify the "Export settings" modal content
        EHoldingsPackageView.openExportModal();
        ExportSettingsModal.verifyModalView();

        // Step 7-8: switch Package section to "Export selected fields", select "Holdings
        // status" and one more field
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.selectPackageFieldsToExport(testData.firstFieldForExport);
        EHoldingsPackageView.selectPackageFieldsToExport(testData.secondFieldForExport);
        EHoldingsPackageView.verifySelectedPackageFieldsToExport([
          testData.firstFieldForExport,
          testData.secondFieldForExport,
        ]);

        // Step 9: switch Title section to "Export selected fields" (leave selection empty -
        // there are no titles in this package)
        EHoldingsPackageView.clickExportSelectedTitleFields();

        // Step 10: click "Export" - back on the Package detail view, success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyPackageDetailViewIsOpened(
          testData.packageName,
          testData.titlesNumber,
          testData.selectedStatus,
        );
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 11: Export manager - verify the job row (Job ID, Status, Job type, Source)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();

          // Step 12: download the exported ".csv" file, verify its name format
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
            selectedPackageHeaderTokens,
          );

          // Step 13: "Package" row (1st row) - known value, only the selected columns present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Holdings Status']).to.equal(testData.selectedStatus);
            expect(Object.keys(data[0]), 'Package CSV columns').to.have.members(
              selectedPackageHeaderTokens,
            );
          });
        });
      },
    );
  });
});
