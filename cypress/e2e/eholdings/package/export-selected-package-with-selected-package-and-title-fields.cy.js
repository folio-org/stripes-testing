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
          authRefresh: true,
        });
        EHoldingsSearch.switchToPackages();
      });
    });

    after('Delete user and test file', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356413 Export all selected titles in a "Package". User chooses "Package" and "Title" fields to export (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356413'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.searchQuery);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        EHoldingsPackages.openPackageWithExpectedTitels(21);
        EHoldingsPackageView.waitLoading();

        EHoldingsPackageView.openExportModal();
        ExportSettingsModal.verifyModalView();

        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();

        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        EHoldingsPackageView.closePackageFieldOption(testData.packageExportFields[2]);
        EHoldingsPackageView.verifySelectedPackageFieldsToExport([
          testData.packageExportFields[0],
          testData.packageExportFields[1],
        ]);
        cy.wait(1000);

        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);

        EHoldingsPackageView.closeTitleFieldOption(testData.titleExportFields[2]);
        EHoldingsPackageView.verifySelectedTitleFieldsToExport([
          testData.titleExportFields[0],
          testData.titleExportFields[1],
        ]);
        cy.wait(1000);

        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            testData.expectedCsvHeaders,
          );
        });
      },
    );
  });
});
