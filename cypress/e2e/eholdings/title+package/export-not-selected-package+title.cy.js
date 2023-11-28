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
      packageName: 'VLeBooks',
      selectionStatus: 'Not selected',
      title: '1,000 Diabetes Recipes',
      fileName: `C356770autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

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
      'C356770 Export of Not selected “Package+Title” with all fields of “Package” and “Title” selected by default settings (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyPackageInResults(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackages.titlesSearchFilter('Title', testData.title, testData.selectionStatus);
        EHoldingsPackageView.selectTitleRecord();
        eHoldingsResourceView.openExportModal();
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyDetailViewPage(testData.title, testData.selectionStatus);
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
