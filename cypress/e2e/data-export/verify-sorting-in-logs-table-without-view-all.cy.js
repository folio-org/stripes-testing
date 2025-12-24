import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import { columnNames } from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
} from '../../support/constants';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import { getLongDelay } from '../../support/utils/cypressTools';

let user;
let location;
const additionalUsers = [];
const emptyFileName = 'empty.csv';
const instanceFiles = {
  single: `AT_C380757_1instance_${getRandomPostfix()}.csv`,
  threeValid: `AT_C380757_3instance_${getRandomPostfix()}.csv`,
  mixedFive: `AT_C380757_5instance_${getRandomPostfix()}.csv`,
  mixedTen: `AT_C380757_10instance_${getRandomPostfix()}.csv`,
  wrongProfile1: `AT_C380757_1instanceWrong_${getRandomPostfix()}.csv`,
  wrongProfile2: `AT_C380757_2instanceWrong_${getRandomPostfix()}.csv`,
};
const holdingsFiles = {
  single: `AT_C380757_1holdings_${getRandomPostfix()}.csv`,
  threeValid: `AT_C380757_3holdings_${getRandomPostfix()}.csv`,
  mixedSeven: `AT_C380757_7holdings_${getRandomPostfix()}.csv`,
  wrongProfile: `AT_C380757_holdingsWrong_${getRandomPostfix()}.csv`,
};
const authorityFiles = {
  single: `AT_C380757_1authority_${getRandomPostfix()}.csv`,
  threeValid: `AT_C380757_3authority_${getRandomPostfix()}.csv`,
  mixedSix: `AT_C380757_6authority_${getRandomPostfix()}.csv`,
};
const folioInstance = { title: `AT_C380757_FolioInstance_${getRandomPostfix()}` };
const marcHolding = {};
const marcAuthority = {};
const invalidUUIDs = [uuid(), uuid(), uuid(), uuid(), uuid()];
const sortDirections = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};
const columnsToVerify = [
  columnNames.FILE_NAME,
  columnNames.STATUS,
  columnNames.TOTAL,
  columnNames.EXPORTED,
  columnNames.FAILED,
  columnNames.JOB_PROFILE,
  columnNames.STARTED_RUNNING,
  columnNames.RUN_BY,
  columnNames.ID,
];

describe('Data Export', () => {
  const createCSVFiles = (recordId, fileSet, recordType) => {
    const validLine = `${recordId}`;
    FileManager.createFile(`cypress/fixtures/${fileSet.single}`, validLine);
    FileManager.createFile(
      `cypress/fixtures/${fileSet.threeValid}`,
      `${validLine}\n${validLine}\n${validLine}`,
    );

    if (recordType === 'instance') {
      FileManager.createFile(
        `cypress/fixtures/${fileSet.mixedFive}`,
        `${validLine}\n${validLine}\n${validLine}\n${invalidUUIDs[0]}\n${invalidUUIDs[1]}`,
      );
      FileManager.createFile(
        `cypress/fixtures/${fileSet.mixedTen}`,
        `${validLine}\n${validLine}\n${validLine}\n${validLine}\n${validLine}\n${invalidUUIDs[0]}\n${invalidUUIDs[1]}\n${invalidUUIDs[2]}\n${invalidUUIDs[3]}\n${invalidUUIDs[4]}`,
      );
      // Create files for wrong profile exports (to generate Failed status)
      FileManager.createFile(`cypress/fixtures/${fileSet.wrongProfile1}`, validLine);
      FileManager.createFile(
        `cypress/fixtures/${fileSet.wrongProfile2}`,
        `${validLine}\n${validLine}`,
      );
    } else if (recordType === 'holdings') {
      FileManager.createFile(
        `cypress/fixtures/${fileSet.mixedSeven}`,
        `${validLine}\n${validLine}\n${validLine}\n${validLine}\n${invalidUUIDs[0]}\n${invalidUUIDs[1]}\n${invalidUUIDs[2]}`,
      );
      FileManager.createFile(
        `cypress/fixtures/${fileSet.wrongProfile}`,
        `${validLine}\n${validLine}\n${validLine}`,
      );
    } else if (recordType === 'authority') {
      FileManager.createFile(
        `cypress/fixtures/${fileSet.mixedSix}`,
        `${validLine}\n${validLine}\n${validLine}\n${invalidUUIDs[0]}\n${invalidUUIDs[1]}\n${invalidUUIDs[2]}`,
      );
    }
  };

  const executeExportsForUser = (userExports) => {
    userExports.forEach(({ file, type, profile }) => {
      ExportFile.exportFileViaApi(file, type, profile);
    });
  };

  const verifyColumnSortingBehavior = (columnName, previousColumnName = null) => {
    // Click column header and verify ascending sort
    DataExportLogs.clickColumnHeader(columnName);
    if (previousColumnName) {
      DataExportLogs.verifyColumnUpDownIcon(previousColumnName);
    }
    DataExportLogs.verifyColumnSortIcon(columnName, true, sortDirections.ASCENDING);
    DataExportLogs.verifyColumnSorted(columnName, sortDirections.ASCENDING);

    // Click column header again and verify descending sort
    DataExportLogs.clickColumnHeader(columnName);
    DataExportLogs.verifyColumnSortIcon(columnName, true, sortDirections.DESCENDING);
    DataExportLogs.verifyColumnSorted(columnName, sortDirections.DESCENDING);
  };

  before('Create test data', () => {
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.then(() => {
        // Create 2 additional users for "Run by" column testing
        for (let i = 0; i < 2; i++) {
          cy.createTempUser([
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            permissions.inventoryAll.gui,
          ]).then((additionalUser) => {
            additionalUsers.push(additionalUser);
          });
        }
      }).then(() => {
        cy.getLocations({ limit: 1 }).then((res) => {
          location = res;
        });

        // Create MARC Bibliographic Instance
        cy.createSimpleMarcBibViaAPI(folioInstance.title).then((marcInstanceId) => {
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
              createCSVFiles(marcInstanceId, instanceFiles, 'instance');
              createCSVFiles(holdingsId, holdingsFiles, 'holdings');
            });
          });
        });

        // Create MARC Authority record
        DataImport.uploadFileViaApi(
          'marcAuthFileForC387482.mrc',
          `testMarcAuthC380757.${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthority.id = record.authority.id;
          });
          createCSVFiles(marcAuthority.id, authorityFiles, 'authority');
        });

        cy.wait(5000);

        // Execute exports as different users (Admin + 2 additional users) = 26 total jobs
        const adminExports = [
          { file: emptyFileName },
          {
            file: instanceFiles.single,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: holdingsFiles.threeValid,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: authorityFiles.mixedSix,
            type: 'authority',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
          {
            file: instanceFiles.mixedTen,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          {
            file: holdingsFiles.single,
            type: 'holding',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: authorityFiles.single,
            type: 'authority',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
          {
            file: instanceFiles.threeValid,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
          },
          // Wrong profile exports to generate Failed status
          {
            file: instanceFiles.wrongProfile1,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
          },
          {
            file: instanceFiles.wrongProfile2,
            type: 'instance',
            profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          },
        ];
        executeExportsForUser(adminExports);

        cy.getUserToken(additionalUsers[0].username, additionalUsers[0].password).then(() => {
          executeExportsForUser([
            { file: emptyFileName },
            {
              file: holdingsFiles.mixedSeven,
              type: 'holding',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
            },
            {
              file: authorityFiles.threeValid,
              type: 'authority',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
            },
            {
              file: instanceFiles.mixedFive,
              type: 'instance',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            },
            {
              file: holdingsFiles.threeValid,
              type: 'holding',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
            },
            {
              file: instanceFiles.single,
              type: 'instance',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            },
            {
              file: authorityFiles.single,
              type: 'authority',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
            },
            // Wrong profile export to generate Failed status
            {
              file: holdingsFiles.wrongProfile,
              type: 'holding',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            },
          ]);
        });

        cy.getUserToken(additionalUsers[1].username, additionalUsers[1].password).then(() => {
          executeExportsForUser([
            { file: emptyFileName },
            {
              file: instanceFiles.threeValid,
              type: 'instance',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            },
            {
              file: holdingsFiles.single,
              type: 'holding',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
            },
            {
              file: authorityFiles.mixedSix,
              type: 'authority',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
            },
            {
              file: instanceFiles.mixedFive,
              type: 'instance',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
            },
            {
              file: authorityFiles.threeValid,
              type: 'authority',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
            },
            {
              file: holdingsFiles.mixedSeven,
              type: 'holding',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
            },
          ]);
        });
      });

      cy.getAdminToken();
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
        'getJobExecutions',
      );
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    additionalUsers.forEach((additionalUser) => {
      Users.deleteViaApi(additionalUser.userId);
    });
    cy.deleteHoldingRecordViaApi(marcHolding.id);
    InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
    MarcAuthority.deleteViaAPI(marcAuthority.id);
    // Delete all CSV files
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
    'C380757 Verify sorting in "Data export" logs table without clicking "View all" button (firebird)',
    { tags: ['extendedPath', 'firebird', 'C380757'] },
    () => {
      // Step 1: Navigate to the "Data export" app by clicking button in the header
      DataExportLogs.verifyViewAllLogsButtonEnabled();
      DataExportLogs.verifyDragAndDropAreaExists();
      DataExportLogs.verifyRunningAccordionExpanded();
      DataExportLogs.verifyViewAllLogsButtonEnabled();

      // Step 2: Open "Payload" tab for request GET /job-executions?query request for COMPLETED jobs status in Devtools, "Network" tab => Check "limit" value for the number of data export jobs displayed in the "Logs" table
      const numberOfDisplayedJobs = 25;

      cy.wait('@getJobExecutions').then((interception) => {
        expect(interception.request.url).to.include(`limit=${numberOfDisplayedJobs}`);
        expect(interception.response.body.jobExecutions.length).to.eq(numberOfDisplayedJobs);
      });

      // Step 3: Verify sorting of data export jobs in the "Logs" table
      DataExportLogs.verifyColumnSorted(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      columnsToVerify.forEach((columnName) => {
        DataExportLogs.verifyColumnUpDownIcon(columnName);
      });

      // Step 4-5: Click "Ended running" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.ENDED_RUNNING);

      // Step 6-7: Click "File name" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.FILE_NAME, columnNames.ENDED_RUNNING);

      // Step 8-9: Click "Status" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.STATUS, columnNames.FILE_NAME);

      // Step 10-11: Click "Total" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.TOTAL, columnNames.STATUS);

      // Step 12-13: Click "Exported" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.EXPORTED, columnNames.TOTAL);

      // Step 14-15: Click "Failed" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.FAILED, columnNames.EXPORTED);

      // Step 16: Click "or choose button" in "Drag and drop" area of "Jobs" pane => Upload any .csv file
      ExportFile.uploadFile(instanceFiles.single);
      ExportFile.exportWithDefaultJobProfile(instanceFiles.single);
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        const jobId = jobData.hrId;
        const exportedFileName = `${instanceFiles.single.replace('.csv', '')}-${jobId}.mrc`;

        DataExportResults.verifySuccessExportResultCells(exportedFileName, 1, jobId, user.username);
        cy.getUserToken(user.username, user.password);
      });

      // Step 17: Verify sorting of data export jobs in the "Logs" table
      DataExportLogs.verifyColumnSorted(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      columnsToVerify.forEach((columnName) => {
        DataExportLogs.verifyColumnUpDownIcon(columnName);
      });

      // Step 18-19: Click "Job profile" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.JOB_PROFILE, columnNames.ENDED_RUNNING);

      // Step 20: Click "Data export" button in the header
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();
      DataExportLogs.verifyColumnSortIcon(columnNames.JOB_PROFILE, true, sortDirections.DESCENDING);
      DataExportLogs.verifyColumnSorted(columnNames.JOB_PROFILE, sortDirections.DESCENDING);

      // Step 21-22: Click "Run by" column name in the header of the "Logs" table twice
      DataExportLogs.scrollTo('right');
      verifyColumnSortingBehavior(columnNames.RUN_BY, columnNames.JOB_PROFILE);

      // Step 23-24: Click "ID" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.ID, columnNames.RUN_BY);

      // Step 25: Reload page by clicking F5
      cy.reload();
      DataExportLogs.waitLoading();
      DataExportLogs.scrollTo('right');
      DataExportLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
      DataExportLogs.verifyColumnSorted(columnNames.ID, sortDirections.DESCENDING);

      // Step 26-27: Click "Started running" column name in the header of the "Logs" table twice
      verifyColumnSortingBehavior(columnNames.STARTED_RUNNING, columnNames.ID);
    },
  );
});
