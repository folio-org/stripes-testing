import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
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
import {
  APPLICATION_NAMES,
  EHOLDINGS_EXPORT_FIELDS,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'Gale OneFile: Science',
      fileName: `C1538646autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      packageData: `C1538646_package_data_${getRandomPostfix()}.csv`,
      titleData: `C1538646_title_data_${getRandomPostfix()}.csv`,
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Creating user, logging in', () => {
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
      'C1538646 Export of selected "Package+Title" with all fields of "Package" and "Title" selected by multi-select option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1538646'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);

        // Step 5: Click on the "Package" record titled "Gale OneFile: Science"
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();

        // Step 6: Titles accordion - click on a "Title" record with "Selected" status
        EHoldingsPackageView.selectTitleRecord();

        // Step 7: Actions > "Export title package (CSV)" - openExportModal() verifies the
        // modal content itself
        eHoldingsResourceView.openExportModal();

        // Step 8: switch both sections to "Export selected fields" - Export button disabled
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 9-10: select every Package field - Export button becomes enabled
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        EHOLDINGS_EXPORT_FIELDS.PACKAGE.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(EHOLDINGS_EXPORT_FIELDS.PACKAGE);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 11-12: select every Title field
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        EHOLDINGS_EXPORT_FIELDS.TITLE.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(EHOLDINGS_EXPORT_FIELDS.TITLE);

        // Step 13: click "Export" - back on the Title detail view, success toast shown
        ExportSettingsModal.clickExportButton();
        eHoldingsResourceView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 14: Export manager - verify the job row (Job ID, Status, Job type, Source)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();

          // Step 15: download the exported ".csv" file, verify its name format
          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportManagerSearchPane.verifyJobDataInResults([
            jobId,
            'Successful',
            'eHoldings',
            testData.user.username,
          ]);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [testData.packageName],
          );

          // Step 16: "Package" row (1st row) - known values, all Package fields are present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            cy.expect(data[0]['Package Id']).to.equal(testData.packageId);
            const missingPackageHeaders = EHOLDINGS_PACKAGE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingPackageHeaders, 'Missing Package CSV columns').to.have.length(0);
          });

          // Step 16: "Title" row (starting 4th row) - only 1 Title record, and all Title
          // fields are present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.equal(1);
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
