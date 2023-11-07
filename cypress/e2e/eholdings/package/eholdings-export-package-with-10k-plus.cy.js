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
      packageName: 'VLeBooks',
      selectedStatus: 'selected',
      // titlesNumber: '0',
      packageExportFields: ['Holdings status', 'Package Id'],
      titleExportFields: ['Alternate title(s)', 'Description'],
      // fileName: `C356417autoTestFile${getRandomPostfix()}.csv`,
      // fileMask: '*_package.csv',
    };
    // const calloutMessage =
    //   'This export may take several minutes to complete. When finished, it will be available in the Export manager app. NOTE: Maximum number of titles in a package you can export is 10000. Filter your search within titles list to not exceed the limit or only choose to export package details only. This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.';

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
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
        // EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        // EHoldingsPackages.verifyOnlySelectedPackagesInResults();
        EHoldingsPackages.openPackage();
        // EHoldingsPackages.openPackageWithExpectedTitels(testData.titlesNumber);
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
        // EHoldingsPackageView.selectPackageFieldsToExport(testData.secondFieldForExport);
        // EHoldingsPackageView.clickExportSelectedTitleFields();

        // EHoldingsPackageView.export();
        // EHoldingsPackageView.verifyPackageDetailViewIsOpened(
        //   testData.packageName,
        //   testData.titlesNumber,
        //   testData.selectedStatus,
        // );
        // EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        // EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
        //   const jobId = id;

        //   cy.visit(TopMenu.exportManagerPath);
        //   ExportManagerSearchPane.searchByEHoldings();
        //   ExportManagerSearchPane.verifyResult(jobId);
        //   ExportManagerSearchPane.exportJob(jobId);
        //   ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);
        //   FileManager.verifyFile(
        //     ExportManagerSearchPane.verifyExportedFileName,
        //     testData.fileMask,
        //     ExportManagerSearchPane.verifyContentOfExportFile,
        //     ['Package Holdings Status', testData.selectedStatus],
        //   );
        // });
      },
    );
  });
});
