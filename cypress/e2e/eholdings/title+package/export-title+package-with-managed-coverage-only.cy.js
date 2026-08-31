import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '58-1017-3389',
      packageName: 'Anthrosource (Wiley)',
      fileName: `C367920autoTestFile${getRandomPostfix()}.csv`,
      fileMask: '*_resource.csv',
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    const dataToVerifyInCSVFile = ['Package Name', 'Title name', 'Managed Coverage'];

    before('Creating user, logging in', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;

          EHoldingsPackages.setCustomCoverageForPackageViaAPI(testData.packageName, '', '');
        })
        .then(() => {
          EHoldingsTitle.changeResourceSelectionStatusViaApi({ resourceId: testData.resourceId });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
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
      'C367920 Export of "Title+Package" record which has filled only "Managed Coverage" field (promin)',
      { tags: ['extendedPath', 'promin', 'C367920'] },
      () => {
        EHoldingsResourceView.verifyNoCustomCoverageDates();

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
            customCoverage: false,
          });

          ExportFile.verifyCSVFileRecordsNumber(testData.fileMask, 5);
        });
      },
    );
  });
});
