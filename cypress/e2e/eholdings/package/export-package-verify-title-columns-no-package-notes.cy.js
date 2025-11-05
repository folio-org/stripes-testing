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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Journal',
      fileName: `C357007autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
    };
    let user;

    before('Create user', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Delete user and cleanup', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357007 Export [Package] Verify that values of "Title" record placed in correct column, when "Package" record has no assigned "Notes" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357007'] },
      () => {
        EHoldingSearch.switchToPackages();
        cy.wait(3000);
        EHoldingsPackagesSearch.byName(testData.packageName);

        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        EHoldingsPackages.openPackage();

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.checkNotesSectionContent([]);

        const ExportModal = EHoldingsPackageView.openExportModal();
        ExportModal.verifyModalView();
        ExportModal.clickExportButton();
        EHoldingsPackageView.waitLoading();

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.waitLoading();
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [
              testData.packageName,
              'Package Name',
              'Package Note',
              'Title Name',
              'Title Note',
              'Title Holdings Status',
            ],
          );
        });
      },
    );
  });
});
