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
import {
  APPLICATION_NAMES,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'VLeBooks',
      selectionStatus: 'Not selected',
      title: '009 Lives',
      fileName: `C356770autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      packageData: `C356770_package_data_${getRandomPostfix()}.csv`,
      titleData: `C356770_title_data_${getRandomPostfix()}.csv`,
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

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
      'C356770 Export of Not selected “Package+Title” with all fields of “Package” and “Title” selected by default settings (promin)',
      { tags: ['criticalPath', 'promin', 'C356770'] },
      () => {
        // Step 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);

        // Step 3: Open the "Package" record titled "VLeBooks"
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        cy.wait(5000);

        // Step 4: Titles accordion - click on a "Title" record with "Not selected" status
        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(testData.selectionStatus);
        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);

        // Step 5: Actions > "Export package (CSV)" - openExportModal() verifies the modal
        // content itself
        eHoldingsResourceView.openExportModal();

        // Step 6: click "Export" (default "All" fields settings kept) - success toast shown
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, testData.selectionStatus);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 7: Export manager - search by the Job ID, verify the row is displayed
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchById(jobId);

          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportManagerSearchPane.verifyJobDataInResults([
            jobId,
            'Successful',
            'eHoldings',
            testData.user.username,
          ]);

          // Step 8: download the exported ".csv" file, verify its name format
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [testData.packageName],
          );

          // Step 9: "Package" row (1st row) - known value, all default Package fields present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            const missingPackageHeaders = EHOLDINGS_PACKAGE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingPackageHeaders, 'Missing Package CSV columns').to.have.length(0);
          });

          // Step 9: "Title" row (starting 4th row) - only 1 Title record, known value, all
          // default Title fields present
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.equal(1);
            cy.expect(data[0]['Title Name']).to.equal(testData.title);
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
