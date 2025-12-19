import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs, {
  accordionNames,
  fieldNames,
  columnNames,
} from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
} from '../../support/constants';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';

let user;
let totalRecordsFromApi;
let location;
const additionalUsers = [];
const emptyFileName = 'empty.csv';
const instanceFiles = {
  single: `AT_C387482_instance1_${getRandomPostfix()}.csv`,
  threeValid: `AT_C387482_instance3_${getRandomPostfix()}.csv`,
  mixedFive: `AT_C387482_instance5_${getRandomPostfix()}.csv`,
  mixedTen: `AT_C387482_instance10_${getRandomPostfix()}.csv`,
};
const holdingsFiles = {
  single: `AT_C387482_holdings1_${getRandomPostfix()}.csv`,
  threeValid: `AT_C387482_holdings3_${getRandomPostfix()}.csv`,
  mixedSeven: `AT_C387482_holdings7_${getRandomPostfix()}.csv`,
};
const authorityFiles = {
  single: `AT_C387482_authority1_${getRandomPostfix()}.csv`,
  threeValid: `AT_C387482_authority3_${getRandomPostfix()}.csv`,
  mixedSix: `AT_C387482_authority6_${getRandomPostfix()}.csv`,
};
const folioInstance = { title: `AT_C387482_FolioInstance_${getRandomPostfix()}` };
const marcHolding = {};
const marcAuthority = {};
const invalidUUIDs = [uuid(), uuid(), uuid(), uuid()];
const currentDate = DateTools.getCurrentDateForFiscalYear();
const sortDirections = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};

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
    } else if (recordType === 'holdings') {
      FileManager.createFile(
        `cypress/fixtures/${fileSet.mixedSeven}`,
        `${validLine}\n${validLine}\n${validLine}\n${validLine}\n${invalidUUIDs[0]}\n${invalidUUIDs[1]}\n${invalidUUIDs[2]}`,
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

  before('Create test data', () => {
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.then(() => {
        // Create 3 additional users for "Run by" column testing
        for (let i = 0; i < 3; i++) {
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
          `testMarcAuthC387482.${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthority.id = record.authority.id;
          });
          createCSVFiles(marcAuthority.id, authorityFiles, 'authority');
        });

        cy.wait(5000);

        // Execute exports as different users (Admin + 3 additional users)
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

        cy.getUserToken(additionalUsers[2].username, additionalUsers[2].password).then(() => {
          executeExportsForUser([
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
              file: authorityFiles.single,
              type: 'authority',
              profile: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
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
      cy.wait('@getJobExecutions').then((interception) => {
        totalRecordsFromApi = interception.response.body.totalRecords;
        expect(totalRecordsFromApi).to.be.greaterThan(0);
      });
      // Sort by Status column to meet precondition: sorted by column other than "Ended running"
      DataExportLogs.clickColumnHeader(columnNames.STATUS);
      DataExportLogs.verifyColumnSorted(columnNames.STATUS, sortDirections.ASCENDING);
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
    'C387482 Verify sorting in "Data export" logs table after clicking "View all" button (firebird)',
    { tags: ['extendedPath', 'firebird', 'C387482'] },
    () => {
      // Step 1: Navigate to the "Data export" app by clicking button in the header. Click "View all" button in the "Logs" main pane
      DataExportViewAllLogs.openAllJobLogs();
      DataExportViewAllLogs.verifySearchAndFilterPane();
      DataExportViewAllLogs.verifyIDOption();
      DataExportViewAllLogs.verifyRecordSearch();
      DataExportViewAllLogs.verifySearchButton();
      DataExportViewAllLogs.verifySearchButtonIsDisabled();
      DataExportViewAllLogs.verifyResetAllButton();
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyErrorsInExportAccordion();
      DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
      DataExportViewAllLogs.verifyStartedRunningAccordion();
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
      DataExportViewAllLogs.verifyEndedRunningAccordion();
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
      DataExportViewAllLogs.verifyJobProfileAccordion();
      DataExportViewAllLogs.verifyJobProfileIsCollapsed();
      DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyLogsIcon();
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyPaginatorExists();

      // Step 2: Open "Preview" tab for recent job-executions in Devtools, "Network" tab => Check "totalRecords" value for the number of data export jobs displayed in the "Logs" table
      // Step 3: Check "Logs" label on the top of the page
      DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then(
        (numberOfRecordsInSubtitle) => {
          expect(numberOfRecordsInSubtitle).to.equal(totalRecordsFromApi);
        },
      );
      DataExportViewAllLogs.verifyLogsTable();

      // Step 4: Verify sorting of data export jobs in the "Logs" table
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.FILE_NAME, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.STATUS, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.TOTAL, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.EXPORTED, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.FAILED, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.JOB_PROFILE, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.STARTED_RUNNING, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.RUN_BY, false);

      // Step 5: Click "Ended running" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.ASCENDING);

      // Step 6: Click "Ended running" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);

      // Step 7: Click "Exported" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.EXPORTED);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ENDED_RUNNING, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.EXPORTED,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.EXPORTED, sortDirections.ASCENDING);

      // Step 8: Click "Exported" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.EXPORTED);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.EXPORTED,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.EXPORTED, sortDirections.DESCENDING);

      // Step 9: Click "Failed" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.FAILED);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.EXPORTED, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.FAILED,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.FAILED, sortDirections.ASCENDING);

      // Step 10: Click "Failed" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.FAILED);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.FAILED,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.FAILED, sortDirections.DESCENDING);

      // Step 11: Click "Job profile" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.JOB_PROFILE);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.FAILED, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.JOB_PROFILE,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.JOB_PROFILE, sortDirections.ASCENDING);

      // Step 12: Click "Job profile" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.JOB_PROFILE);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.JOB_PROFILE,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.JOB_PROFILE, sortDirections.DESCENDING);

      // Step 13: Click "Status" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.STATUS);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.JOB_PROFILE, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STATUS,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.STATUS, sortDirections.ASCENDING);

      // Step 14: Click "Status" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.STATUS);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STATUS,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.STATUS, sortDirections.DESCENDING);

      // Step 15: Expand "Job profile" accordion under "Search & filter" pane => Select any job profile from "Choose job profile" dropdown
      DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
      DataExportViewAllLogs.clickJobProfileDropdown();
      DataExportViewAllLogs.selectFilterOption(DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES);
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyLogsFilteredByJobProfile(
        DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.STATUS, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STATUS,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyResetAllButtonEnabled();

      // Step 16: Click "ID" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.ID);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.STATUS, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.ASCENDING);

      // Step 17: Click "ID" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.ID);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.DESCENDING);

      // Step 18: Click "x" icon next to the "Job profile" accordion under "Search & filter" pane
      DataExportViewAllLogs.clickClearJobProfileFilter();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyResetAllIsDisabled();

      // Step 19: Choose filters under all accordions in "Search & filter" pane
      DataExportViewAllLogs.checkErrorsInExportOption('No');
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
      DataExportViewAllLogs.clickApplyButton(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.expandAccordion(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
      DataExportViewAllLogs.clickApplyButton(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
      DataExportViewAllLogs.clickJobProfileDropdown();
      DataExportViewAllLogs.selectFilterOption(DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY);
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyLogsFilteredByColumn(
        columnNames.JOB_PROFILE,
        DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.ID, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, true, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyResetAllButtonEnabled();

      // Step 20: Click "Run by" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.RUN_BY);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ID, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.RUN_BY,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.RUN_BY, sortDirections.ASCENDING);

      // Step 21: Click "Run by" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.RUN_BY);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.RUN_BY,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.RUN_BY, sortDirections.DESCENDING);

      let filteredRecordsNumber;

      DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then(
        (numberOfRecordsInSubtitle) => {
          filteredRecordsNumber = numberOfRecordsInSubtitle;
        },
      );

      // Step 22: Click "Reset all" button in "Search & filter" pane
      DataExportViewAllLogs.resetAll();
      DataExportViewAllLogs.verifyPlaceholderInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
      );
      DataExportViewAllLogs.verifyPlaceholderInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
      );
      DataExportViewAllLogs.verifyPlaceholderInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
      );
      DataExportViewAllLogs.verifyPlaceholderInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
      );
      DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
      DataExportViewAllLogs.verifySelectedValueInJobProfileDropdown('Select control');
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then(
        (numberOfRecordsAfterResetFilters) => {
          expect(numberOfRecordsAfterResetFilters).to.be.greaterThan(filteredRecordsNumber);
        },
      );

      // Step 23: Check checkbox next to "NO" under "Errors in export" accordion
      DataExportViewAllLogs.checkErrorsInExportOption('No');
      DataExportViewAllLogs.verifyLogsFilteredByColumn(
        columnNames.STATUS,
        JOB_STATUS_NAMES.COMPLETED,
      );
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyResetAllButtonEnabled();

      // Step 24: Reload page by clicking F5
      cy.reload();
      DataExportViewAllLogs.verifyTableWithResultsExists();
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', true);
      DataExportViewAllLogs.verifyLogsFilteredByColumn(
        columnNames.STATUS,
        JOB_STATUS_NAMES.COMPLETED,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyResetAllButtonEnabled();

      // Step 25: Click "Total" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.TOTAL);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ENDED_RUNNING, false);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.TOTAL, true, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.TOTAL, sortDirections.ASCENDING);

      // Step 26: Click "Total" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.TOTAL);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.TOTAL,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.TOTAL, sortDirections.DESCENDING);

      // Step 27: Click "Started running" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.TOTAL, false);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(columnNames.STARTED_RUNNING, sortDirections.ASCENDING);

      // Step 28: Click "Started running" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSort(
        columnNames.STARTED_RUNNING,
        sortDirections.DESCENDING,
      );

      // Step 29: Reload page
      cy.reload();
      DataExportViewAllLogs.verifyTableWithResultsExists();
      DataExportViewAllLogs.verifyColumnSort(
        columnNames.STARTED_RUNNING,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );

      // Step 30: Click "Data export" button in the header
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();
      DataExportViewAllLogs.verifyTableWithResultsExists();
      DataExportLogs.verifyColumnSorted(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );
    },
  );
});
