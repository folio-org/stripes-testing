import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
let exportedMrcFileName;
let createdInstanceId;
const randomPostfix = getRandomPostfix();
const marcInstance = { title: `AT_C895650_MarcInstance_${randomPostfix}` };
const exportedFileFromApi = `AT_C895650_api_export_${randomPostfix}.mrc`;
const exportedFileFromApiSuppressed = `AT_C895650_api_suppressed_${randomPostfix}.mrc`;
const csvFileForQuickExport = `AT_C895650_instance_${randomPostfix}.csv`;

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.moduleDataImportEnabled.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((marcInstanceId) => {
          marcInstance.id = marcInstanceId;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileFromApi}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileFromApiSuppressed}`);
      FileManager.deleteFile(`cypress/fixtures/${csvFileForQuickExport}`);
      FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
    });

    it(
      'C895650 Verify suppress999ff parameter of /data-export/download-record/{recordId} endpoint for Instance records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C895650'] },
      () => {
        // Step 1: Send GET request /data-export/download-record/{recordId} with idType=INSTANCE (without suppress999ff)
        cy.getAdminToken();
        cy.downloadDataExportRecordViaApi(marcInstance.id, 'INSTANCE').then((body) => {
          cy.wrap(body).should('include', marcInstance.id);

          // Step 2: Save the response to .mrc file
          FileManager.createFile(`cypress/fixtures/${exportedFileFromApi}`, body);
        });

        // Step 3: From Inventory app - Export instance (MARC)
        cy.getUserToken(user.username, user.password);
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstanceCheckboxByIndex(0);
        InventoryInstances.exportInstanceMarc();

        cy.intercept('/data-export/quick-export').as('quickExport');
        cy.wait('@quickExport', getLongDelay()).then((interception) => {
          const expectedUUIDs = interception.request.body.uuids;

          FileManager.verifyFile(
            InventoryActions.verifyInstancesMARCFileName,
            'QuickInstanceExport*',
            InventoryActions.verifyInstancesMARC,
            [expectedUUIDs],
          );
          ExportFile.verifyCSVFileRecordsNumber('QuickInstanceExport*.csv', 1);

          // Step 4: Go to Data export app and download auto-generated .mrc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
          cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedMrcFileName = `quick-export-${jobId}.mrc`;

            DataExportLogs.clickButtonWithText(exportedMrcFileName);
            cy.wait(2000); // Wait for file download

            // Step 5: Compare records from Step 2 (API) and Step 4 (Quick Export)
            FileManager.findDownloadedFilesByMask(exportedMrcFileName).then((downloadedFiles) => {
              const quickExportFile = downloadedFiles[0];

              FileManager.verifyFilesHaveEqualContent(
                quickExportFile,
                `cypress/fixtures/${exportedFileFromApi}`,
              );

              // Cleanup downloaded file
              FileManager.deleteFileFromDownloadsByMask(exportedMrcFileName);
            });
          });
          DataExportLogs.waitLoading();

          // Step 6: Send GET request with suppress999ff=true
          cy.getAdminToken();
          cy.downloadDataExportRecordViaApi(marcInstance.id, 'INSTANCE', {
            suppress999ff: 'true',
          }).then((body) => {
            cy.wrap(body).should('not.include', marcInstance.id);

            // Step 7: Save the response to .mrc file
            FileManager.createFile(`cypress/fixtures/${exportedFileFromApiSuppressed}`, body);

            // Step 8: From Data import app - Upload suppressed .mrc file and create instance
            cy.getUserToken(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
            DataImport.verifyUploadState();
            DataImport.uploadFileViaApi(
              exportedFileFromApiSuppressed,
              exportedFileFromApiSuppressed,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            ).then((response) => {
              createdInstanceId = response[0].instance.id;
            });
            Logs.checkJobStatus(exportedFileFromApiSuppressed, JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(exportedFileFromApiSuppressed);
            Logs.clickOnHotLink(0, 3, RECORD_STATUSES.CREATED);
            InventoryInstance.verifyInstanceTitle(marcInstance.title);
          });
        });
      },
    );
  });
});
