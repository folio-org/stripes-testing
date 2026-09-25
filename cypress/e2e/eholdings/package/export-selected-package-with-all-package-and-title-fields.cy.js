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
import {
  APPLICATION_NAMES,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
  EHOLDINGS_EXPORT_FIELDS,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Wiley Online Library Online Book Series',
      fileName: `C1554376autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      packageData: `C1554376_package_data_${getRandomPostfix()}.csv`,
      titleData: `C1554376_title_data_${getRandomPostfix()}.csv`,
      selectedStatus: 'Selected',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Create user and login', () => {
      cy.getAdminToken();
      EHoldingsPackages.getPackageViaApi(testData.packageName).then(({ body }) => {
        const matchedPackage = body.data.find(
          (pack) => pack.attributes.name === testData.packageName,
        );
        testData.packageId = matchedPackage.id;
      });

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
      'C1554376 Export all selected titles in a "Package". User chooses all "Package" and "Titles" fields to export (using multi-select option) (promin)',
      { tags: ['extendedPath', 'promin', 'C1554376'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        // Step 5: Click on the "Package" record titled "Gale OneFile: Science"
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        // Step 6: Actions > "Export package (CSV)" - openExportModal() verifies the modal itself
        EHoldingsPackageView.openExportModal();
        ExportSettingsModal.verifyModalView();

        // Step 7: switch both sections to "Export selected fields" - Export button disabled
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 8-9: select every Package field - Export button becomes enabled
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        EHOLDINGS_EXPORT_FIELDS.PACKAGE.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(EHOLDINGS_EXPORT_FIELDS.PACKAGE);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 10-11: select every Title field
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        EHOLDINGS_EXPORT_FIELDS.TITLE.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(EHOLDINGS_EXPORT_FIELDS.TITLE);

        // Step 12: click "Export" - back on the Package detail view, success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 13: Export manager - verify the job row (Job ID, Status, Job type, Source)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();

          // Step 14: download the exported ".csv" file, verify its name format
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
            [testData.packageName],
          );

          // Step 15: "Package" row - known values, and every expected column is present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Id']).to.equal(testData.packageId);
            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            const missingPackageHeaders = EHOLDINGS_PACKAGE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingPackageHeaders, 'Missing Package CSV columns').to.have.length(0);
          });

          // Step 15: "Title" rows - every expected column is present (a package can have many
          // selected titles, so only column presence is checked here, not an exact row count)
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.be.greaterThan(0);
            const missingTitleHeaders = EHOLDINGS_TITLE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingTitleHeaders, 'Missing Title CSV columns').to.have.length(0);
          });
        });
      },
    );
  });
});
