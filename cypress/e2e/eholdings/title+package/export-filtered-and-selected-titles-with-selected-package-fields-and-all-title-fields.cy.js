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
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { EHoldingsPackage } from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'EBSCO',
      fileName: `C356415autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_package.csv',
      selectedStatus: 'Selected',
      filterQuery: 'Journal',
      packageFieldsToSelect: [
        'Custom Coverage',
        'Agreements',
        'Notes',
        'Package Content Type',
        'Package Id',
      ],
    };

    const selectedPackageHeaderTokens = [
      'Package Custom Coverage',
      'Package Agreements',
      'Package Note',
      'Package Content Type',
      'Package Id',
    ];
    const representativeTitleHeaders = [
      'Title name',
      'Title ID',
      'Publication Type',
      'Contributors',
      'Subjects',
      'Description',
      'URL',
    ];

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
      'C356415 Export filtered and selected titles with selected Package fields + all Title fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356415'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackage.searchTitles(testData.filterQuery);

        EHoldingsPackageView.openExportModal();
        EHoldingsPackageView.clickExportSelectedPackageFields();
        EHoldingsPackageView.verifySelectedPackageFieldsOptions();
        testData.packageFieldsToSelect.forEach((field) => {
          EHoldingsPackageView.selectPackageFieldsToExport(field);
        });
        EHoldingsPackageView.verifySelectedPackageFieldsToExport(testData.packageFieldsToSelect);
        ExportSettingsModal.verifyExportButtonDisabled(false);
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
            (actualContent) => {
              const lowerContent = actualContent.toLowerCase();
              selectedPackageHeaderTokens.forEach((hdr) => {
                expect(lowerContent).to.include(hdr.toLowerCase());
              });
              representativeTitleHeaders.forEach((hdr) => {
                expect(lowerContent).to.include(hdr.toLowerCase());
              });
            },
          );
        });
      },
    );
  });
});
