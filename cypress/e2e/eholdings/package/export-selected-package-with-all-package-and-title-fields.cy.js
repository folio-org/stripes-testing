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
      packageName: 'Book Online Library',
      fileName: `C353945autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      selectedStatus: 'Selected',
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
      'C353945 Export all selected titles in a "Package". User chooses all "Package" and "Titles" fields to export (using multi-select option) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353945'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        EHoldingsPackageView.openExportModal();
        ExportSettingsModal.verifyModalView();

        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.clickExportSelectedTitleFields();
        ExportSettingsModal.verifyExportButtonDisabled();
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();

        EHOLDINGS_EXPORT_FIELDS.PACKAGE.forEach((packageField) => {
          EHoldingsPackageView.selectPackageFieldsToExport(packageField);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(EHOLDINGS_EXPORT_FIELDS.PACKAGE);
        ExportSettingsModal.verifyExportButtonDisabled(false);
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();

        EHOLDINGS_EXPORT_FIELDS.TITLE.forEach((titleField) => {
          EHoldingsPackageView.selectTitleFieldsToExport(titleField);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(EHOLDINGS_EXPORT_FIELDS.TITLE);
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);

          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          const allExpectedHeaders = [...EHOLDINGS_PACKAGE_HEADERS, ...EHOLDINGS_TITLE_HEADERS];

          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            allExpectedHeaders,
          );
        });
      },
    );
  });
});
