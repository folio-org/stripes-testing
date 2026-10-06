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
import { APPLICATION_NAMES, EHOLDINGS_TITLE_HEADERS } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'EBSCO',
      fileName: `C356415autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      packageData: `C356415_package_data_${getRandomPostfix()}.csv`,
      titleData: `C356415_title_data_${getRandomPostfix()}.csv`,
      selectedStatus: 'Selected',
      filterQuery: 'Journal',
      packageFieldsToSelect: [
        'Custom Coverage',
        'Agreements',
        'Notes',
        'Package Content Type',
        'Package Id',
      ],
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const selectedPackageHeaderTokens = [
      'Package Custom Coverage',
      'Package Agreements',
      'Package Note',
      'Package Content Type',
      'Package Id',
    ];

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
        EHoldingSearch.switchToPackages();
      });
    });

    after('Delete user and artifacts', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.packageData);
      FileManager.deleteFileFromDownloadsByMask(testData.titleData);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356415 Export filtered and selected titles with selected Package fields + all Title fields (promin)',
      { tags: ['extendedPath', 'promin', 'C356415'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);

        // Step 5: View "Package" record with "Total titles" value more than 100
        EHoldingsPackages.sortPackagesByTitlesCount({ minTitlesCount: 100 }).then((packages) => {
          [testData.package] = packages;
          EHoldingsPackages.openPackageWithExpectedName(testData.package.name);
          EHoldingsPackageView.verifyPackageDetailViewIsOpened(
            testData.package.name,
            testData.package.countTotalTitles,
            testData.selectedStatus,
          );

          // Step 6: Titles accordion - click the "magnifying glass" icon, "Filter titles" modal
          // opens (openFilterTitlesModal() verifies the modal content itself)
          EHoldingsPackageView.getFilteredTitlesCount().then((titlesBeforeFilter) => {
            const FilterTitlesModal = EHoldingsPackageView.openFilterTitlesModal();

            // Step 7: Fill in search query, click "Search" - modal closes, count decreases
            FilterTitlesModal.typeSearchQuery(testData.filterQuery);
            FilterTitlesModal.clickSearchButton();

            EHoldingsPackageView.getFilteredTitlesCount().then((titlesAfterFilter) => {
              expect(titlesAfterFilter).to.be.lessThan(titlesBeforeFilter);
              testData.filteredTitlesCount = titlesAfterFilter;
            });
          });

          // Step 8: Actions > "Export package (CSV)" - openExportModal() verifies the modal itself
          EHoldingsPackageView.openExportModal();
          ExportSettingsModal.verifyModalView();

          // Step 9-10: switch Package section to "Export selected fields", select some fields
          EHoldingsPackageView.clickExportSelectedPackageFields();
          EHoldingsPackageView.verifySelectedPackageFieldsOptions();
          testData.packageFieldsToSelect.forEach((field) => {
            EHoldingsPackageView.selectPackageFieldsToExport(field);
          });
          EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageFieldsToSelect);
          ExportSettingsModal.verifyExportButtonDisabled(false);

          // Step 11: click "Export" - back on the Package detail view, success toast shown
          ExportSettingsModal.clickExportButton();
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

          EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
            // Step 12: Export manager - verify the job row (Job ID, Status, Job type, Source)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByEHoldings();

            // Step 13: download the exported ".csv" file, verify its name format
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

            // Step 14: "Package" row (1st row) - known value, only the selected columns present
            FileManager.writeToSeparateFile({
              readFileName: testData.fileMask,
              writeFileName: testData.packageData,
              lines: [0, 2],
            });
            FileManager.convertCsvToJson(testData.packageData).then((data) => {
              cy.expect(data[0]['Package Name']).to.equal(testData.package.name);
              expect(Object.keys(data[0]), 'Package CSV columns').to.have.members(
                selectedPackageHeaderTokens,
              );
            });

            // Step 14: "Title" rows (starting 4th row) - row count matches the filtered titles
            // count from step 7, and every Title field is present (all fields were selected).
            // Column title casing isn't checked, per the TestRail note that it may differ
            FileManager.writeToSeparateFile({
              readFileName: testData.fileMask,
              writeFileName: testData.titleData,
              lines: [2],
            });
            FileManager.convertCsvToJson(testData.titleData).then((data) => {
              cy.expect(data.length).to.equal(testData.filteredTitlesCount);
              const actualHeadersLower = Object.keys(data[0]).map((header) => header.toLowerCase());
              const missingTitleHeaders = EHOLDINGS_TITLE_HEADERS.filter(
                (header) => !actualHeadersLower.includes(header.toLowerCase()),
              );
              expect(missingTitleHeaders, 'Missing Title CSV columns').to.have.length(0);
            });
          });
        });
      },
    );
  });
});
