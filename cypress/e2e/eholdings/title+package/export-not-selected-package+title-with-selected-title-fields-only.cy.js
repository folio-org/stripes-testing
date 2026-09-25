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
      packageName: 'Wiley Online Library Online Books 2020 (TAEBDC)',
      fileName: `C356773autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      titleExportFields: ['Contributors', 'Custom label', 'Description'],
      title: 'Encyclopedia of Computational Mechanics',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    // "Custom label" is a single dropdown option but maps to 5 separate CSV columns
    // ("Custom value <n+1>"), per TestRail's own note
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
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356773 Export of Not selected "Package+title" with user selected fields of "Title" and no fields of "Package" (promin)',
      { tags: ['extendedPath', 'promin', 'C356773'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Not selected" status
        EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.NOT_SELECTED);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);

        // Step 5: View "Package" record which has titles
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        // Step 6: Titles accordion - click on a "Title" record with "Not selected" status
        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(FILTER_STATUSES.NOT_SELECTED);
        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);

        // Step 7: Actions > "Export title package (CSV)" - openExportModal() verifies the
        // modal content itself
        eHoldingsResourceView.openExportModal();

        // Step 8: switch both sections to "Export selected fields" - Package dropdown is left
        // empty (no Package fields selected), so no Package row/columns appear in the export
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 9: select some (not all) Title fields - Export button becomes enabled
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 10: click "Export" - success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, FILTER_STATUSES.NOT_SELECTED);
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
            [selectedTitleHeaders[0]],
          );

          // Step 13: no Package fields were selected, so the whole file is the "Title" row -
          // only 1 Title record, only the selected columns are present (accounting for
          // "Custom label" expanding to 5 columns), no Package row at all
          FileManager.convertCsvToJson(testData.fileMask).then((data) => {
            cy.expect(data.length).to.equal(1);
            expect(Object.keys(data[0]), 'Title CSV columns').to.have.members(selectedTitleHeaders);
          });
        });
      },
    );
  });
});
