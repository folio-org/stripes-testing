import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
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
      fileName: `C356762autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      packageData: `C356762_package_data_${getRandomPostfix()}.csv`,
      packageExportFields: ['Custom Coverage', 'Agreements', 'Notes'],
      title: 'AAHE-ERIC/Higher Education Research Report',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const selectedPackageHeaders = [
      'Package Custom Coverage',
      'Package Agreements',
      'Package Note',
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
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356762 Export of selected "Package+title" with user selected fields of "Package" and no fields of "Title" (promin)',
      { tags: ['extendedPath', 'promin', 'C356762'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
        EHoldingsPackages.verifyPackageExistsInResults(testData.packageName);

        // Step 5: View "Package" record which has titles
        EHoldingsPackages.openPackageByName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        // Step 6: Titles accordion - click on a "Title" record with "Selected" status
        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(FILTER_STATUSES.SELECTED);
        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);

        // Step 7: Actions > "Export title package (CSV)" - openExportModal() verifies the
        // modal content itself
        eHoldingsResourceView.openExportModal();

        // Step 8: switch Package section to "Export selected fields" (Title section stays "All")
        EHoldingsPackageView.clickExportSelectedPackageFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 9: select some (not all) Package fields - Export button becomes enabled
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 10: click "Export" - success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, FILTER_STATUSES.SELECTED);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 11: Export manager - search by the Job ID, verify the row is displayed
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchById(jobId);

          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportManagerSearchPane.verifyJobDataInResults([
            jobId,
            'Successful',
            'eHoldings',
            testData.user.username,
          ]);

          // Step 12: download the exported ".csv" file, verify its name format
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [testData.packageName],
          );

          // Step 13: "Package" row (2nd row) - known value, only the selected columns present.
          // The "_resource.csv" format always has exactly 1 package data row (row 2) by
          // construction, matching TestRail's "only 1 Package record" expectation
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            expect(Object.keys(data[0]), 'Package CSV columns').to.have.members(
              selectedPackageHeaders,
            );
          });
        });
      },
    );
  });
});
