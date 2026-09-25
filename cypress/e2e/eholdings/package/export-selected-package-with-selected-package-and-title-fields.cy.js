import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Sabinet African Journals (Juta Law Journals)',
      fileName: `C356413autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      selectedStatus: 'Selected',
      searchQuery: 'Journal',
      packageExportFields: ['Package Name', 'Package Type', 'Tags'],
      titleExportFields: ['Title name', 'Publisher', 'Tags'],
      expectedCsvHeaders: ['Package Name', 'Package Type', 'Title Name', 'Publisher'],
      packageData: `C356413_package_data_${getRandomPostfix()}.csv`,
      titleData: `C356413_title_data_${getRandomPostfix()}.csv`,
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Create user and login', () => {
      cy.getAdminToken();
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
        EHoldingsSearch.switchToPackages();
      });
    });

    after('Delete user and test file', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
      FileManager.deleteFileFromDownloadsByMask(testData.packageData);
      FileManager.deleteFileFromDownloadsByMask(testData.titleData);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356413 Export all selected titles in a "Package". User chooses "Package" and "Title" fields to export (promin)',
      { tags: ['extendedPath', 'promin', 'C356413'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.searchQuery);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        // Step 5: View "Package" record with "Total titles" value more than 1
        EHoldingsPackages.openPackageWithExpectedTitels(20);
        EHoldingsPackageView.waitLoading();

        // Step 6: Actions > "Export package (CSV)" - openExportModal() verifies the modal itself
        EHoldingsPackageView.openExportModal();
        ExportSettingsModal.verifyModalView();

        // Step 7: switch both sections to "Export selected fields" - Export button disabled
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 8: select some (not all) Package fields - Export button becomes enabled
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 9: deselect one Package field option, verify remaining selection
        EHoldingsPackageView.closePackageFieldOption(testData.packageExportFields[2]);
        EHoldingsPackageView.verifySelectedPackageFieldsToExport([
          testData.packageExportFields[0],
          testData.packageExportFields[1],
        ]);
        cy.wait(1000);

        // Step 10-11: select some (not all) Title fields
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);

        // Step 12: deselect one Title field option, verify remaining selection
        EHoldingsPackageView.closeTitleFieldOption(testData.titleExportFields[2]);
        EHoldingsPackageView.verifySelectedTitleFieldsToExport([
          testData.titleExportFields[0],
          testData.titleExportFields[1],
        ]);
        cy.wait(1000);

        // Step 13: click "Export" - back on the Package detail view, success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 14: Export manager - verify the job row (Job ID, Status, Job type, Source)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();

          // Step 15: download the exported ".csv" file, verify its name format -
          // exportJobRecursively waits (reloading) until the job leaves "In progress" before
          // clicking the Job ID link, so it must run before checking for a "Successful" status
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
            testData.expectedCsvHeaders,
          );

          // Step 16: "Package" row - known value, and only the selected columns are present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            expect(Object.keys(data[0]), 'Package CSV columns').to.have.members([
              'Package Name',
              'Package Type',
            ]);
          });

          // Step 16: "Title" rows - only the selected columns are present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.be.greaterThan(0);
            expect(Object.keys(data[0]), 'Title CSV columns').to.have.members([
              'Title Name',
              'Publisher',
            ]);
          });
        });
      },
    );
  });
});
