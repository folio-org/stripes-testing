import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
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
      packageName: 'E-Journal',
      selectedStatus: 'Selected',
      titlesNumber: '0',
      firstFieldForExport: 'Holdings status',
      secondFieldForExport: 'Notes',
      fileName: `C356417autoTestFile${getRandomPostfix()}.csv`,
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
        cy.wait(8000);
      });
    });

    after('Deleting user, data', () => {
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
    });

    it(
      'C356417 Export of selected “Package” without titles. User chooses "Package" fields to export. (spitfire)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();
        EHoldingsPackages.openPackageWithExpectedTitels(testData.titlesNumber);
        EHoldingsPackageView.verifyPackageDetailViewIsOpened(
          testData.packageName,
          testData.titlesNumber,
          testData.selectedStatus,
        );
        EHoldingsPackageView.openExportModal();
        EHoldingsPackageView.verifyExportModal();
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.selectPackageFieldsToExport(testData.firstFieldForExport);
        EHoldingsPackageView.selectPackageFieldsToExport(testData.secondFieldForExport);
        EHoldingsPackageView.clickExportSelectedTitleFields();
        EHoldingsPackageView.export();
        EHoldingsPackageView.verifyPackageDetailViewIsOpened(
          testData.packageName,
          testData.titlesNumber,
          testData.selectedStatus,
        );
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
          const jobId = id;

          cy.visit(TopMenu.exportManagerPath);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);
          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            ['Package Holdings Status', testData.selectedStatus],
          );
        });
      },
    );
  });
});
