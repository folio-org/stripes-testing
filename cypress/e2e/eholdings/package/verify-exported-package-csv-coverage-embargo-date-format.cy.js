import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
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
      packageName: 'SORA Journals',
      fileName: `C378887_export_${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Delete user and test files', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C378887 Verify that in exported Package ".csv" "Managed Coverage; Embargo", "Custom Coverage; Embargo" fields are filled in same date format as displayed in "eHoldings" app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C378887'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();

        const ExportModal = EHoldingsPackageView.openExportModal();
        ExportModal.verifyModalView();
        ExportModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJobRecursively({ jobId });

          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.convertCsvToJson(testData.fileMask).then((csvData) => {
            csvData.forEach((row) => {
              // Verify Managed Coverage format - should contain "Present" instead of "9999/12/31"
              if (row['Managed Coverage'] && row['Managed Coverage'].includes('-')) {
                cy.expect(row['Managed Coverage']).to.match(/\d{4}\/\d{2}\/\d{2}\s*-\s*Present/i);
                cy.expect(row['Managed Coverage']).to.not.include('9999');
              }
              // Verify Custom Coverage format - should contain "Present" instead of "9999/12/31"
              if (row['Custom Coverage'] && row['Custom Coverage'].includes('-')) {
                cy.expect(row['Custom Coverage']).to.match(/\d{4}\/\d{2}\/\d{2}\s*-\s*Present/i);
                cy.expect(row['Custom Coverage']).to.not.include('9999');
              }
              // Verify Managed Embargo format - should contain time units instead of "null"
              if (row['Managed Embargo'] && row['Managed Embargo'].trim() !== '') {
                cy.expect(row['Managed Embargo']).to.not.include('null');
                cy.expect(row['Managed Embargo']).to.match(/\d+\s+(year|month|week|day)/i);
              }
              // Verify Custom Embargo format - should contain time units instead of "null"
              if (row['Custom Embargo'] && row['Custom Embargo'].trim() !== '') {
                cy.expect(row['Custom Embargo']).to.not.include('null');
                cy.expect(row['Custom Embargo']).to.match(/\d+\s+(year|month|week|day)/i);
              }
            });
          });
        });
      },
    );
  });
});
