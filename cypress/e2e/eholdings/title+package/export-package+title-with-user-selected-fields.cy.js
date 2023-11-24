import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { AssignedUsers } from '../../../support/fragments/settings/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'Wiley Online Library',
      fileName: `C356770autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      selectedStatus: 'Selected',
      packageExportFields: ['Custom Coverage', 'Agreements', 'Notes'],
      titleExportFields: ['Contributors', 'Custom label', 'Description'],
      title: 'AAHE-ERIC/Higher Education Research Report',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const dataToVerifyInCSVFile = [
      'Custom Coverage',
      'Agreements',
      'Notes',
      'Contributors',
      'Custom label',
      'Description',
      'AAHE-ERIC/Higher Education Research Report',
      'Wiley Online Library',
    ];

    before('Creating user, logging in', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        AssignedUsers.assignUserToDefaultCredentialsViaApi({ userId: testData.user.userId });

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
    });

    it(
      'C356760 Export of selected “Package+title” with user selected fields of “Package” and “Title” (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackages.titlesSearchFilter('Title', testData.title, testData.selectedStatus);
        EHoldingsPackageView.selectTitleRecord();
        eHoldingsResourceView.openExportModal();
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageExportFields.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);
        EHoldingsPackageView.closePackageFieldOption(testData.packageExportFields[0]);
        EHoldingsPackageView.fillInPackageFieldsToExport(testData.packageExportFields[0]);

        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);
        EHoldingsPackageView.closeTitleFieldOption(testData.titleExportFields[0]);
        EHoldingsPackageView.fillInTitleFieldsToExport(testData.titleExportFields[0]);

        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, testData.selectedStatus);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
          const jobId = id;

          cy.visit(TopMenu.exportManagerPath);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            ...dataToVerifyInCSVFile,
          );
        });
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      },
    );
  });
});
