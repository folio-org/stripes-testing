import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '58-1017-674810',
      fileName: `C367921autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
      customCoverageRange: {
        startDay: '01/01/2026',
        startDayApi: '2026-01-01',
        startDayCsv: '2026/01/01',
        endDay: '12/31/2028',
        endDayApi: '2028-12-31',
        endDayCsv: '2028/12/31',
      },
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const dataToVerifyInCSVFile = [
      'Package Name',
      'Title name',
      'Managed Coverage',
      'Custom Coverage',
    ];

    before('Creating user, logging in', () => {
      cy.getAdminToken();

      EHoldingsResourceEdit.addCustomCoverageViaAPI(testData.resourceId, {
        beginDate: testData.customCoverageRange.startDayApi,
        endDate: testData.customCoverageRange.endDayApi,
      });

      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: `/eholdings/resources/${testData.resourceId}`,
          waiter: EHoldingsResourceView.waitLoading,
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C367921 Export of "Title+Package" record which has filled "Managed Coverage" and "Custom Coverage" fields (promin)',
      { tags: ['extendedPath', 'promin', 'C367921'] },
      () => {
        EHoldingsResourceView.checkCustomPeriods([testData.customCoverageRange]);
        EHoldingsResourceView.openExportModal();
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);
        EHoldingsPackageView.getJobIDFromCalloutMessage().then((id) => {
          const jobId = id;
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);

          ExportManagerSearchPane.exportJob(jobId);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            EHoldingsResourceView.verifyPackagesResourceExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            ...dataToVerifyInCSVFile,
          );

          EHoldingsResourceView.verifyCoverageInExportedCSV(testData.fileName, {
            managedCoverage: true,
            customCoverage: {
              startDate: testData.customCoverageRange.startDayCsv,
              endDate: testData.customCoverageRange.endDayCsv,
            },
          });

          ExportFile.verifyCSVFileRecordsNumber(testData.fileMask, 5);
        });
      },
    );
  });
});
