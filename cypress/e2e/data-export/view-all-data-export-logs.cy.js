import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES } from '../../support/constants';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const instanceFiles = {
  valid: `AT_C15848_valid_${getRandomPostfix()}.csv`,
  completedWithErrors: `AT_C15848_errors_${getRandomPostfix()}.csv`,
  failed: `AT_C15848_failed_${getRandomPostfix()}.csv`,
};
const folioInstances = [];
const invalidUUIDs = [uuid(), uuid()];
const numberOfLogsToCreate = 26;
const exportedFileNames = {
  completed: '',
  completedWithErrors: '',
  failed: '',
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
      (userProperties) => {
        user = userProperties;

        // Create FOLIO Instances for export
        cy.then(() => {
          for (let i = 0; i < 3; i++) {
            const instanceTitle = `AT_C15848_FolioInstance_${getRandomPostfix()}`;
            cy.createSimpleMarcBibViaAPI(instanceTitle).then((marcInstanceId) => {
              folioInstances.push({ instanceId: marcInstanceId, title: instanceTitle });
            });
          }
        }).then(() => {
          // Create CSV files for export
          // Valid file - will result in "Completed" status
          FileManager.createFile(
            `cypress/fixtures/${instanceFiles.valid}`,
            folioInstances[0].instanceId,
          );

          // File with some invalid UUIDs - will result in "Completed with errors" status
          FileManager.createFile(
            `cypress/fixtures/${instanceFiles.completedWithErrors}`,
            `${folioInstances[1].instanceId}\n${invalidUUIDs[0]}`,
          );

          // File with all invalid UUIDs - will result in "Fail" status
          FileManager.createFile(
            `cypress/fixtures/${instanceFiles.failed}`,
            `${invalidUUIDs[0]}\n${invalidUUIDs[1]}`,
          );

          // Export files and capture the job info for test data with different statuses
          // Export valid file - will result in "Completed" status
          ExportFile.exportFileViaApi(
            instanceFiles.valid,
            'instance',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          ).then((jobExecution) => {
            if (jobExecution.exportedFiles && jobExecution.exportedFiles[0]) {
              exportedFileNames.completed = jobExecution.exportedFiles[0].fileName;
            }
          });

          // Export file with errors - will result in "Completed with errors" status
          ExportFile.exportFileViaApi(
            instanceFiles.completedWithErrors,
            'instance',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          ).then((jobExecution) => {
            if (jobExecution.exportedFiles && jobExecution.exportedFiles[0]) {
              exportedFileNames.completedWithErrors = jobExecution.exportedFiles[0].fileName;
            }
          });

          // Export invalid file - will result in "Fail" status
          ExportFile.exportFileViaApi(
            instanceFiles.failed,
            'instance',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          ).then((jobExecution) => {
            if (jobExecution.exportedFiles && jobExecution.exportedFiles[0]) {
              exportedFileNames.failed = jobExecution.exportedFiles[0].fileName;
            }
          });

          // Execute additional exports to create more than 25 logs (precondition)
          for (let i = 3; i < numberOfLogsToCreate; i++) {
            const fileToUse =
              i % 3 === 0
                ? instanceFiles.valid
                : i % 3 === 1
                  ? instanceFiles.completedWithErrors
                  : instanceFiles.failed;
            ExportFile.exportFileViaApi(
              fileToUse,
              'instance',
              DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            );
          }
        });

        cy.getAdminToken();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    folioInstances.forEach((instance) => {
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    Object.values(instanceFiles).forEach((fileName) => {
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });
  });

  it(
    'C15848 View All data export logs (firebird)',
    { tags: ['criticalPath', 'firebird', 'C15848'] },
    () => {
      // Step 1: Click "View all" button in the "Logs" main pane
      DataExportViewAllLogs.openAllJobLogs();
      DataExportViewAllLogs.verifySearchAndFilterPane();

      // Step 2: Verify "Search & filter" pane elements
      DataExportViewAllLogs.verifyIDOption();
      DataExportViewAllLogs.verifyRecordSearch();
      DataExportViewAllLogs.verifySearchButtonIsDisabled();
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
      DataExportViewAllLogs.verifyJobProfileIsCollapsed();
      DataExportViewAllLogs.verifyUserAccordionIsCollapsed();

      // Step 3: Verify "Logs" main pane elements
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyLogsIcon();
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyPaginatorExists();

      // Step 4: Click the row with any data export log with "Completed" status
      DataExportLogs.clickFileNameFromTheList(exportedFileNames.completed);
      DataExportViewAllLogs.verifyTableWithResultsExists();

      // Step 5: Click the row with any data export log with "Completed with errors" status
      DataExportLogs.clickFileNameFromTheList(exportedFileNames.completedWithErrors);
      DataExportLogs.verifyErrorTextInErrorLogsPane('ERROR Record not found:');

      // Step 6: Click "Back" arrow
      cy.go('back');
      DataExportViewAllLogs.verifySearchAndFilterPane();
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyRecordsFoundText();

      // Step 7: Click the row with any data export log with "Fail" status
      DataExportLogs.clickFileNameFromTheList(exportedFileNames.failed);
      DataExportLogs.verifyErrorTextInErrorLogsPane('ERROR Record not found:');

      // Step 8: Click "Data export" button in the header
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();
      DataExportLogs.verifyRunningAccordionExpanded();
      DataExportLogs.verifyDragAndDropAreaExists();
    },
  );
});
