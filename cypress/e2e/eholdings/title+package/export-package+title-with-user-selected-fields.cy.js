import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
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
  describe('Title+Package', () => {
    const testData = {
      packageName: 'Wiley Online Library',
      fileName: `C356760autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      packageData: `C356760_package_data_${getRandomPostfix()}.csv`,
      titleData: `C356760_title_data_${getRandomPostfix()}.csv`,
      selectedStatus: 'Selected',
      packageExportFields: ['Agreements', 'Custom Coverage', 'Notes'],
      packageExportFieldsRearranged: ['Custom Coverage', 'Notes', 'Agreements'],
      titleExportFields: ['Contributors', 'Custom label', 'Description'],
      title: 'AAHE-ERIC/Higher Education Research Report',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    // "Custom label" is a single dropdown option but maps to 5 separate CSV columns
    // ("Custom value <n+1>"), per TestRail's own note
    const selectedPackageHeaders = [
      'Package Custom Coverage',
      'Package Agreements',
      'Package Note',
    ];
    const selectedTitleHeaders = [
      'Contributors',
      'Custom Value 1',
      'Custom Value 2',
      'Custom Value 3',
      'Custom Value 4',
      'Custom Value 5',
      'Description',
    ];

    before('Creating user, logging in', () => {
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
        EHoldingSearch.switchToPackages();
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.packageData);
      FileManager.deleteFileFromDownloadsByMask(testData.titleData);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356760 Export of selected “Package+title” with user selected fields of “Package” and “Title” (promin) (TaaS)',
      { tags: ['criticalPath', 'promin', 'C356760'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyPackageExistsInResults(testData.packageName);

        // Step 5: View "Package" record which has titles
        EHoldingsPackages.openPackageByName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        // Step 6: Titles accordion - click on a "Title" record with "Selected" status
        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(testData.selectedStatus);
        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);

        // Step 7: Actions > "Export title package (CSV)" - openExportModal() verifies the
        // modal content itself
        eHoldingsResourceView.openExportModal();

        // Step 8: switch both sections to "Export selected fields" - Export button disabled
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 9: select some (not all) Package fields - Export button becomes enabled
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 10-11: delete one Package field option, then re-add it by typing its value + Enter
        EHoldingsPackageView.closePackageFieldOption(testData.packageExportFields[0]);
        EHoldingsPackageView.fillInPackageFieldsToExport(testData.packageExportFields[0]);
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(
          testData.packageExportFieldsRearranged,
        );

        // Step 12: select some (not all) Title fields
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);

        // Step 13-14: delete one Title field option, then re-add it by typing its value + Enter
        EHoldingsPackageView.closeTitleFieldOption(testData.titleExportFields[0]);
        EHoldingsPackageView.fillInTitleFieldsToExport(testData.titleExportFields[0]);
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);

        // Step 15: click "Export" - success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, testData.selectedStatus);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 16: Export manager - search by the Job ID, verify the row is displayed
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchById(jobId);

          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportManagerSearchPane.verifyJobDataInResults([
            jobId,
            'Successful',
            'eHoldings',
            testData.user.username,
          ]);

          // Step 17: download the exported ".csv" file, verify its name format
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [selectedPackageHeaders[0]],
          );

          // Step 18: "Package" row (1st row) - only the selected columns are present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            expect(Object.keys(data[0]), 'Package CSV columns').to.have.members(
              selectedPackageHeaders,
            );
          });

          // Step 18: "Title" row (starting 4th row) - only 1 Title record, only the selected
          // columns are present (accounting for "Custom label" expanding to 5 columns)
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.equal(1);
            expect(Object.keys(data[0]), 'Title CSV columns').to.have.members(selectedTitleHeaders);
          });
        });
      },
    );
  });
});
