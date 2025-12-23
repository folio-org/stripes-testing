import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs, {
  columnNames,
} from '../../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let location;
let totalRecordsFromApi;
const instanceFiles = {
  file1: `AT_C360557_instance1_${getRandomPostfix()}.csv`,
  file2: `AT_C360557_instance2_${getRandomPostfix()}.csv`,
  file3: `AT_C360557_instance3_${getRandomPostfix()}.csv`,
};
const holdingsFiles = {
  file1: `AT_C360557_holdings1_${getRandomPostfix()}.csv`,
  file2: `AT_C360557_holdings2_${getRandomPostfix()}.csv`,
  file3: `AT_C360557_holdings3_${getRandomPostfix()}.csv`,
};
const authorityFiles = {
  file1: `AT_C360557_authority1_${getRandomPostfix()}.csv`,
  file2: `AT_C360557_authority2_${getRandomPostfix()}.csv`,
  file3: `AT_C360557_authority3_${getRandomPostfix()}.csv`,
};
const invalidUUIDs = [uuid(), uuid()];
const folioInstance = {};
const marcHolding = {};
const marcAuthority = {};
const sortDirections = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};

const createCSVFiles = (validRecordId, invalidRecordIds, fileSet) => {
  const validLine = `${validRecordId}`;
  FileManager.createFile(`cypress/fixtures/${fileSet.file1}`, validLine);
  FileManager.createFile(
    `cypress/fixtures/${fileSet.file2}`,
    `${validLine}\n${validLine}\n${validLine}`,
  );
  FileManager.createFile(
    `cypress/fixtures/${fileSet.file3}`,
    `${validLine}\n${validLine}\n${invalidRecordIds[0]}\n${invalidRecordIds[1]}`,
  );
};

const verifyColumnSortToggle = (columnName, previousColumnName = null) => {
  // Click column header and verify ascending sort
  DataExportViewAllLogs.clickColumnHeader(columnName);
  if (previousColumnName) {
    DataExportViewAllLogs.verifyColumnSortIcon(previousColumnName, false);
  }
  DataExportViewAllLogs.verifyColumnSortIcon(columnName, true, sortDirections.ASCENDING);
  DataExportViewAllLogs.verifyColumnSort(columnName, sortDirections.ASCENDING);

  // Click column header again and verify descending sort
  DataExportViewAllLogs.clickColumnHeader(columnName);
  DataExportViewAllLogs.verifyColumnSortIcon(columnName, true, sortDirections.DESCENDING);
  DataExportViewAllLogs.verifyColumnSort(columnName, sortDirections.DESCENDING);
};

const verifyUnsortedColumns = (columns) => {
  columns.forEach((columnName) => {
    DataExportViewAllLogs.verifyColumnSortIcon(columnName, false);
  });
};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([permissions.dataExportViewOnly.gui]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({ limit: 1 }).then((res) => {
          location = res;
        });

        // Create MARC Bibliographic Instance
        cy.createSimpleMarcBibViaAPI(`AT_C360557MarcInstance_${getRandomPostfix()}`).then(
          (marcInstanceId) => {
            folioInstance.instanceId = marcInstanceId;

            cy.getInstanceById(marcInstanceId).then((instanceData) => {
              folioInstance.hrid = instanceData.hrid;

              // Create MARC Holdings for the MARC bib instance
              cy.createSimpleMarcHoldingsViaAPI(
                folioInstance.instanceId,
                folioInstance.hrid,
                location.code,
              ).then((holdingsId) => {
                marcHolding.id = holdingsId;
                createCSVFiles(marcInstanceId, invalidUUIDs, instanceFiles);
                createCSVFiles(holdingsId, invalidUUIDs, holdingsFiles);
              });
            });
          },
        );

        // Create MARC Authority record
        DataImport.uploadFileViaApi(
          'marcAuthFileForC387482.mrc',
          `testMarcAuthC360557.${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthority.id = record.authority.id;
          });
          createCSVFiles(marcAuthority.id, invalidUUIDs, authorityFiles);
        });

        // Execute 11 different export jobs
        const exportJobs = [
          {
            file: instanceFiles.file1,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: instanceFiles.file2,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: instanceFiles.file3,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: holdingsFiles.file1,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: holdingsFiles.file2,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: holdingsFiles.file3,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: authorityFiles.file1,
            type: 'authority',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
          {
            file: authorityFiles.file2,
            type: 'authority',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
          {
            file: authorityFiles.file3,
            type: 'authority',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
          {
            file: instanceFiles.file1,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: holdingsFiles.file1,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
        ];

        exportJobs.forEach(({ file, type, profile }) => {
          ExportFile.exportFileViaApi(file, type, profile);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Object.values(instanceFiles).forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
      Object.values(holdingsFiles).forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
      Object.values(authorityFiles).forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
    });

    it(
      'C360557 Verify sorting on View all logs form (firebird)',
      { tags: ['extendedPath', 'firebird', 'C360557'] },
      () => {
        // Step 1: Navigate to "Data export" app
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getJobExecutions',
        );
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        cy.wait('@getJobExecutions').then((interception) => {
          totalRecordsFromApi = interception.response.body.totalRecords;
          expect(totalRecordsFromApi).to.be.greaterThan(0);
        });

        // Step 2: Click the "View all" button in the top right corner
        DataExportViewAllLogs.openAllJobLogs();
        DataExportViewAllLogs.verifyTableWithResultsExists();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportViewAllLogs.verifyRecordsFoundText();
        DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then(
          (numberOfRecordsInSubtitle) => {
            expect(numberOfRecordsInSubtitle).to.equal(totalRecordsFromApi);
          },
        );
        DataExportViewAllLogs.verifyPaginatorExists();
        verifyUnsortedColumns([
          columnNames.FILE_NAME,
          columnNames.STATUS,
          columnNames.TOTAL,
          columnNames.EXPORTED,
          columnNames.FAILED,
          columnNames.JOB_PROFILE,
          columnNames.STARTED_RUNNING,
          columnNames.RUN_BY,
          columnNames.ID,
        ]);

        // Step 3: Verify "Ended running" column
        DataExportViewAllLogs.verifyColumnSort(
          columnNames.ENDED_RUNNING,
          sortDirections.DESCENDING,
        );
        DataExportViewAllLogs.verifyColumnSortIcon(
          columnNames.ENDED_RUNNING,
          true,
          sortDirections.DESCENDING,
        );

        // Step 4: Click "Ended running" column name in the header of the "Logs" table
        DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
        DataExportViewAllLogs.verifyColumnSortIcon(
          columnNames.ENDED_RUNNING,
          true,
          sortDirections.ASCENDING,
        );
        DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.ASCENDING);

        // Step 5: Click "Ended running" column name in the header of the "Logs" table once again
        DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
        DataExportViewAllLogs.verifyColumnSortIcon(
          columnNames.ENDED_RUNNING,
          true,
          sortDirections.DESCENDING,
        );
        DataExportViewAllLogs.verifyColumnSort(
          columnNames.ENDED_RUNNING,
          sortDirections.DESCENDING,
        );

        // Step 6: Click "File name" column name in the header of the "Logs" table
        // Step 7: Click "File name" column name in the header of the "Logs" table once again
        // (isn't imlemented yet)
        // verifyColumnSortToggle(columnNames.FILE_NAME, columnNames.ENDED_RUNNING);

        // Step 8: Click "Status" column name in the header of the "Logs" table
        // Step 9: Click "Status" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.STATUS, columnNames.FILE_NAME);

        // Step 10: Click "Total" column name in the header of the "Logs" table
        // Step 11: Click "Total" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.TOTAL, columnNames.STATUS);

        // Step 12: Click "Exported" column name in the header of the "Logs" table
        // Step 13: Click "Exported" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.EXPORTED, columnNames.TOTAL);

        // Step 14: Click "Failed" column name in the header of the "Logs" table
        // Step 15: Click "Failed" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.FAILED, columnNames.EXPORTED);

        // Step 16: Click "Job profile" column name in the header of the "Logs" table
        // Step 17: Click "Job profile" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.JOB_PROFILE, columnNames.FAILED);

        // Step 18: Click "Started running" column name in the header of the "Logs" table
        // Step 19: Click "Started running" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.STARTED_RUNNING, columnNames.JOB_PROFILE);

        // Step 20: Click "Run by" column name in the header of the "Logs" table
        // Step 21: Click "Run by" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.RUN_BY, columnNames.STARTED_RUNNING);

        // Step 22: Click "ID" column name in the header of the "Logs" table
        // Step 23: Click "ID" column name in the header of the "Logs" table once again
        verifyColumnSortToggle(columnNames.ID, columnNames.RUN_BY);

        // Step 24: Check checkboxes next to "No" options under "Errors in export" accordion on "Search & filter" pane
        DataExportViewAllLogs.checkErrorsInExportOption('No');
        DataExportViewAllLogs.verifyLogsTable();
        DataExportViewAllLogs.verifyLogsFilteredByColumn(
          columnNames.STATUS,
          JOB_STATUS_NAMES.COMPLETED,
        );
        DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.DESCENDING);
        DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
        DataExportViewAllLogs.verifyResetAllButtonEnabled();

        // Step 25: Click "x" icon next to the "Errors in export" accordion on "Search & filter" pane
        DataExportViewAllLogs.clickTheCrossIcon();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.DESCENDING);
        DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
        DataExportViewAllLogs.verifyResetAllIsDisabled();

        // Step 26: Select any filter on "Search & filter" pane > Click "Reset all" button
        DataExportViewAllLogs.checkErrorsInExportOption('Yes');
        DataExportViewAllLogs.verifyResetAllButtonEnabled();
        DataExportViewAllLogs.resetAll();
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
        DataExportViewAllLogs.verifyResetAllIsDisabled();
        DataExportViewAllLogs.verifyColumnSort(
          columnNames.ENDED_RUNNING,
          sortDirections.DESCENDING,
        );
        DataExportViewAllLogs.verifyColumnSortIcon(
          columnNames.ENDED_RUNNING,
          true,
          sortDirections.DESCENDING,
        );
        verifyUnsortedColumns([
          columnNames.FILE_NAME,
          columnNames.STATUS,
          columnNames.TOTAL,
          columnNames.EXPORTED,
          columnNames.FAILED,
          columnNames.JOB_PROFILE,
          columnNames.STARTED_RUNNING,
          columnNames.RUN_BY,
          columnNames.ID,
        ]);
      },
    );
  });
});
