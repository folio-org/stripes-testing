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
      fileName: `C356761autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      titleExportFields: ['Contributors', 'Custom label', 'Description'],
      title: 'AAHE-ERIC/Higher Education Research Report',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const titleDataToVerify = [
      'Contributors',
      'Title name',
      'Description',
      'AAHE-ERIC/Higher Education Research Report',
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
      'C356761 Export of selected "Package+title" with user selected fields of "Title" and no fields of "Package" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356761'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);

        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();

        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(FILTER_STATUSES.SELECTED);

        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);
        eHoldingsResourceView.openExportModal();

        EHoldingsPackageView.clickExportSelectedTitleFields();
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleExportFields.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleExportFields);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        EHoldingsPackageView.closeTitleFieldOption(testData.titleExportFields[0]);
        EHoldingsPackageView.fillInTitleFieldsToExport(testData.titleExportFields[0]);

        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, FILTER_STATUSES.SELECTED);
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
          const jobId = id;

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);

          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            eHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            ...titleDataToVerify,
          );
        });
      },
    );
  });
});
