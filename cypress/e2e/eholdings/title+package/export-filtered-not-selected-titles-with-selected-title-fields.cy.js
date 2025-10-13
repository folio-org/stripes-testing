import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, EHOLDINGS_PACKAGE_HEADERS } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { EHoldingsPackage } from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'VLeBooks',
      fileName: `C356420autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      notSelectedStatus: 'Not selected',
      filterQuery: 'Specific',
      titleFieldsToSelect: ['Title name', 'Contributors', 'Publication Type'],
    };

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
        EHoldingSearch.switchToPackages();
      });
    });

    after('Delete user and artifacts', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C356420 Export filtered and not selected titles (Package all fields + selected Title fields) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356420'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackage.searchTitles(testData.filterQuery);

        EHoldingsPackageView.verifyNumberOfTitlesLessThan(10000);

        EHoldingsPackageView.openExportModal();

        EHoldingsPackageView.clickExportSelectedTitleFields();
        EHoldingsPackageView.verifySelectedTitleFieldsOptions();
        testData.titleFieldsToSelect.forEach((field) => {
          EHoldingsPackageView.selectTitleFieldsToExport(field);
        });
        EHoldingsPackageView.verifySelectedTitleFieldsToExport(testData.titleFieldsToSelect);

        ExportSettingsModal.clickExportButton();

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            EHOLDINGS_PACKAGE_HEADERS,
            testData.titleFieldsToSelect,
          );
        });
      },
    );
  });
});
