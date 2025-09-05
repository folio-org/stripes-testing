import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
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

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'VLeBooks',
      selectionStatus: 'Not selected',
      title: '009 Lives',
      fileName: `C356770autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
    };

    const dataToVerifyInCSVFile = [
      'Provider level token',
      'Provider Name',
      'Provider Id',
      'Package level token',
      'Package Name',
      'Package Id',
      'Package Type',
      'Package Content Type',
      'Package Holdings status',
      'Package Custom Coverage',
      'Package Show To Patrons',
      'Package Automatically Select',
      'Package Proxy',
      'Package Access Status Type',
      'Package Tags',
      'Package Agreements',
      'Package Note',
      'Title name',
      'Alternate titles',
      'Title ID',
      'Publication Type',
      'Title type',
      'Title Holdings status',
      'Title Show to patron',
      'Managed coverage',
      'Managed Embargo',
      'Custom coverage',
      'Custom Embargo',
      'Coverage statement',
      'Title Proxy',
      'URL',
      'Title Access status type',
      'Title Tags',
      'Contributors',
      'Edition',
      'Publisher',
      'ISSN Print',
      'ISSN Online',
      'ISBN Print',
      'ISBN Online',
      'Subjects',
      'Peer reviewed',
      'Description',
      'Custom Value 1',
      'Custom Value 2',
      'Custom Value 3',
      'Custom Value 4',
      'Custom Value 5',
      'Title Agreements',
      'Title Notes',
      '1,000 Diabetes Recipes',
      'VLeBooks',
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

        cy.waitForAuthRefresh(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
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
      'C356770 Export of Not selected “Package+Title” with all fields of “Package” and “Title” selected by default settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C356770'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        cy.wait(5000);
        EHoldingsPackage.searchTitles(testData.title, 'Title');
        EHoldingsPackage.filterTitles(testData.selectionStatus);
        EHoldingsPackageView.selectTitleRecordByTitle(testData.title);
        eHoldingsResourceView.openExportModal();
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, testData.selectionStatus);
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
            ...dataToVerifyInCSVFile,
          );
        });
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      },
    );
  });
});
