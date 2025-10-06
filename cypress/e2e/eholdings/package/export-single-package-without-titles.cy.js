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
      customPackageName: `C360110_package_${getRandomPostfix()}`,
      fileName: `C360110autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
    };
    let user;

    before('Create user and custom package without titles', () => {
      cy.getAdminToken().then(() => {
        const packageBody = {
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
            },
          },
        };
        EHoldingsPackages.createPackageViaAPI(packageBody);
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
    });

    after('Delete user and package', () => {
      cy.getAdminToken().then(() => {
        EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
        FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
        FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C360110 Export of single "Package" record that doesn\'t have "Titles" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360110'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.customPackageName);

        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageDetailViewIsOpened(
          testData.customPackageName,
          0,
          'Selected',
        );
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
            [testData.customPackageName, 'Custom', 'Selected', 'E-Book'],
          );
        });
      },
    );
  });
});
