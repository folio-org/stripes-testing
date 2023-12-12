import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'VLeBooks',
      selectedStatus: 'selected',
      packageExportFields: ['Holdings status', 'Package Id'],
      titleExportFields: ['Alternate title(s)', 'Description'],
      titleFilterParams: ['Title', 'Francaise e', 'Not selected'],
      fileName: `C367972exportCSVFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Creating user, logging in', () => {
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
        cy.wait(3000);
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
    });

    it(
      'C367972 "Export" button must be disabled when user tries to export "Package" record with more than 10k of "Title" records (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.verifyDetailViewPage(testData.packageName, testData.selectedStatus);
        EHoldingsPackageView.openExportModal();
        EHoldingsPackageView.verifyExportModal(true);
        EHoldingsPackageView.clickExportSelectedPackageFields();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        EHoldingsPackageView.verifyExportButtonInModalDisabled();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);
        EHoldingsPackageView.verifyExportButtonInModalDisabled();
        EHoldingsPackageView.clearSelectedFieldsToExport();
        EHoldingsPackageView.verifySelectedPackageFieldsToExport([]);
        EHoldingsPackageView.verifySelectedTitleFieldsToExport([]);
        EHoldingsPackageView.verifyExportButtonInModalDisabled();
        EHoldingsPackageView.clickExportAllPackageFields();
        EHoldingsPackageView.clickExportAllTitleFields();
        EHoldingsPackageView.verifyExportButtonInModalDisabled();
        EHoldingsPackageView.closeExportModalViaCancel();
        EHoldingsPackages.titlesSearchFilter(...testData.titleFilterParams);
        // wait for titles list to update
        cy.wait(6000);
        EHoldingsPackageView.verifyNumberOfTitlesLessThan(10000);
        EHoldingsPackageView.openExportModal();
        EHoldingsPackageView.verifyExportModal();
        EHoldingsPackageView.clickExportSelectedPackageFields();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        EHoldingsPackageView.verifyExportButtonInModalDisabled(false);
        EHoldingsPackageView.clickExportSelectedTitleFields();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);
        EHoldingsPackageView.verifyExportButtonInModalDisabled(false);
        EHoldingsPackageView.clearSelectedFieldsToExport();
        EHoldingsPackageView.verifySelectedPackageFieldsToExport([]);
        EHoldingsPackageView.verifySelectedTitleFieldsToExport([]);
        EHoldingsPackageView.verifyExportButtonInModalDisabled();
        EHoldingsPackageView.clickExportAllPackageFields();
        EHoldingsPackageView.clickExportAllTitleFields();
        EHoldingsPackageView.verifyExportButtonInModalDisabled(false);

        EHoldingsPackageView.export();
        EHoldingsPackageView.verifyPackageName(testData.packageName);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
          const jobId = id;
          cy.visit(TopMenu.exportManagerPath);
          ExportManagerSearchPane.waitLoading();
          // wait until export finished
          cy.wait(10000);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [
              'Package Holdings Status',
              testData.selectedStatus,
              'Package Name',
              testData.packageName,
              'Title Name',
              'Française',
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        });
      },
    );
  });
});
