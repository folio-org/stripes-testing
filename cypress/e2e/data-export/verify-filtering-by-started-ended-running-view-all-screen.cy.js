import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs, {
  accordionNames,
  fieldNames,
  columnNames,
} from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import { DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES } from '../../support/constants';

let user;
const emptyFileName = 'empty.csv';
const validFileName = `validFile${getRandomPostfix()}.csv`;
const folioInstance = { title: `AT_C404372_FolioInstance_${getRandomPostfix()}` };
const currentDate = DateTools.getCurrentDateForFiscalYear();
const yesterday = DateTools.getPreviousDayDateForFiscalYear();
const dayAfterTomorrow = DateTools.getDayAfterTomorrowDateForFiscalYear();
const exportRecordType = 'instance';
const defaultJobProfile = DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES;
const validationMessages = {
  pleaseEnterStartDate: 'Please enter a start date',
  pleaseEnterEndDate: 'Please enter an end date',
  startDateGreaterThanEndDate: 'Start date is greater than end date',
};
const sortDirections = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};
const emptyValue = '';

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: folioInstance.title,
            instanceTypeId: instanceTypes[0].id,
          },
        }).then((instanceData) => {
          folioInstance.instanceId = instanceData.instanceId;

          // Create 4 export jobs with empty CSV file (empty total/failed records)
          for (let i = 0; i < 4; i++) {
            ExportFile.exportFileViaApi(emptyFileName);
          }

          ExportFile.exportFileViaApi(
            emptyFileName,
            'authority',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          );

          // Create CSV file with instance UUID for valid export
          FileManager.createFile(`cypress/fixtures/${validFileName}`, instanceData.instanceId);

          // Export the instance with default job profile
          ExportFile.exportFileViaApi(validFileName, exportRecordType, defaultJobProfile);
        });
      });

      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });

      // Sort by Status column to meet precondition: sorted by column other than "Ended running"
      DataExportLogs.clickColumnHeader(columnNames.STATUS);
      DataExportLogs.verifyColumnSorted(columnNames.STATUS, sortDirections.ASCENDING);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
    FileManager.deleteFile(`cypress/fixtures/${validFileName}`);
  });

  it(
    'C404372 Verify filtering by Started running and Ended running on the "View all" screen (firebird)',
    { tags: ['extendedPath', 'firebird', 'C404372'] },
    () => {
      // Step 1: Click "View all" button in the "Logs" main pane
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

      // Step 2: Verify sorting of data export jobs in the "Logs" table
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );

      // Step 3: Click "Ended running" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.ASCENDING,
      );

      // Step 4: Click "Ended running" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.ENDED_RUNNING, sortDirections.DESCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.ENDED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );

      // Step 5: Click "Started running" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyColumnSort(columnNames.STARTED_RUNNING, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ENDED_RUNNING, false);

      // Step 6: Click "Started running" column name in the header of the "Logs" table once again
      DataExportViewAllLogs.clickColumnHeader(columnNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyColumnSort(
        columnNames.STARTED_RUNNING,
        sortDirections.DESCENDING,
      );
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.DESCENDING,
      );

      // Step 7: Click on "Started running" accordion in "Search & filter" pane
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyAccordionExpanded(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyStartedRunningDateFields();
      DataExportViewAllLogs.verifyApplyButtonDisabled(false);
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);

      // Step 8: Click on "Ended running" accordion in "Search & filter" pane
      DataExportViewAllLogs.expandAccordion(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyAccordionExpanded(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyEndedRunningDateFields();
      DataExportViewAllLogs.verifyApplyButtonDisabled(false);

      // Step 9: Pick up any date from the calendar in "From" date picker field of "Started running" accordion
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyClearButtonExistsInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        true,
      );

      // Step 10: Click "Apply" button in the "Started running" accordion
      DataExportViewAllLogs.clickApplyButton(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyErrorInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        validationMessages.pleaseEnterEndDate,
      );

      // Step 11: Pick up the date from the calendar in "To" date picker field of "Started running" accordion earlier than date picked up in "From"
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        yesterday,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        yesterday,
      );
      DataExportViewAllLogs.verifyClearButtonExistsInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        true,
      );

      // Step 12: Click "Apply" button in the "Started running" accordion
      DataExportViewAllLogs.clickApplyButton(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyValidationMessage(
        accordionNames.STARTED_RUNNING,
        validationMessages.startDateGreaterThanEndDate,
      );

      // Step 13: Click "x" icon in "From" date pickers field of the "Started running" accordion => Click "Apply" button
      DataExportViewAllLogs.clickClearButtonInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
      );
      DataExportViewAllLogs.clickApplyButton(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyPlaceholderInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
      );
      DataExportViewAllLogs.verifyCalendarButtonInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
      );
      DataExportViewAllLogs.verifyErrorInFieldInAccordion(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        validationMessages.pleaseEnterStartDate,
      );

      // Step 14: Pick up the date from the calendar in "From" date picker field of "Started running" accordion earlier than date picked up in "To" => Click "Apply" button
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
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyStartedRunningDateRangeFilter(currentDate, currentDate);
      DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then((numberOfRecords) => {
        // Step 15: Click "x" icon of the "Started running" accordion
        DataExportViewAllLogs.clickClearStartedRunningAccordionFilters();
        DataExportViewAllLogs.verifyStartedRunningDateFields();
        DataExportViewAllLogs.verifyDateFieldValue(
          accordionNames.STARTED_RUNNING,
          fieldNames.FROM,
          emptyValue,
        );
        DataExportViewAllLogs.verifyDateFieldValue(
          accordionNames.STARTED_RUNNING,
          fieldNames.TO,
          emptyValue,
        );
        DataExportViewAllLogs.verifyLogsTable();
        DataExportViewAllLogs.getNumberOfFoundRecordsFromSubtitle().then((newNumberOfRecords) => {
          expect(newNumberOfRecords).to.be.greaterThan(numberOfRecords);
        });
      });

      // Step 16: Pick up any date from the calendar in "To" date picker field of "Ended running" accordion
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
      DataExportViewAllLogs.verifyClearButtonExistsInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        true,
      );

      // Step 17: Click "Apply" button in the "Ended running" accordion
      DataExportViewAllLogs.clickApplyButton(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyErrorInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        validationMessages.pleaseEnterStartDate,
      );

      // Step 18: Pick up the date from the calendar in "From" date picker field of "Ended running" accordion later than date picked up in "To" => Click "Apply" button
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        dayAfterTomorrow,
      );
      DataExportViewAllLogs.clickApplyButton(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyValidationMessage(
        accordionNames.ENDED_RUNNING,
        validationMessages.startDateGreaterThanEndDate,
      );

      // Step 19: Click "x" icon in "To" date picker field of the "Ended running" accordion => Pick up the same date from the calendar in "To" date picker field => Click "Apply" button
      DataExportViewAllLogs.clickClearButtonInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
      );
      DataExportViewAllLogs.fillDateInFieldInAccordion(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        dayAfterTomorrow,
      );
      DataExportViewAllLogs.clickApplyButton(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyValidationMessage(
        accordionNames.ENDED_RUNNING,
        validationMessages.startDateGreaterThanEndDate,
        false,
      );
      DataExportViewAllLogs.verifyNoResultsFound();
      DataExportViewAllLogs.verifyFoundRecordsCount(0);

      // Step 20: Click "Reset all" button in the "Set criteria" pane
      DataExportViewAllLogs.resetAll();
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        emptyValue,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        emptyValue,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        emptyValue,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        emptyValue,
      );
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyResetAllIsDisabled();

      // Step 21: Pick up from the calendar in "From" and "To" fields the same date for "Started running" accordion => Click "Apply" button
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
      DataExportViewAllLogs.verifyClearAccordionButtonExists(accordionNames.STARTED_RUNNING, true);
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
      DataExportViewAllLogs.verifyClearAccordionButtonExists(accordionNames.ENDED_RUNNING, true);
      DataExportViewAllLogs.verifyResetAllButtonEnabled();

      // Step 22: Click on "Started running" accordion
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();

      // Step 23: Click on "Started running" accordion
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyAccordionExpanded(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        currentDate,
      );

      // Step 24: Click on the "Ended running" accordion
      DataExportViewAllLogs.expandAccordion(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();

      // Step 25: Click on the "Ended running" accordion
      DataExportViewAllLogs.expandAccordion(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyAccordionExpanded(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        currentDate,
      );

      // Step 26: Click "Started running" column name in the header of the "Logs" table
      DataExportViewAllLogs.clickColumnHeader(columnNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ENDED_RUNNING, false);
      DataExportViewAllLogs.verifyColumnSort(columnNames.STARTED_RUNNING, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.ASCENDING,
      );

      // Step 27: Reload page
      cy.reload();
      DataExportViewAllLogs.verifyTableWithResultsExists();
      DataExportViewAllLogs.verifyColumnSortIcon(columnNames.ENDED_RUNNING, false);
      DataExportViewAllLogs.verifyColumnSort(columnNames.STARTED_RUNNING, sortDirections.ASCENDING);
      DataExportViewAllLogs.verifyColumnSortIcon(
        columnNames.STARTED_RUNNING,
        true,
        sortDirections.ASCENDING,
      );
      DataExportViewAllLogs.expandAccordion(accordionNames.STARTED_RUNNING);
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.STARTED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
      DataExportViewAllLogs.expandAccordion(accordionNames.ENDED_RUNNING);
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.FROM,
        currentDate,
      );
      DataExportViewAllLogs.verifyDateFieldValue(
        accordionNames.ENDED_RUNNING,
        fieldNames.TO,
        currentDate,
      );
    },
  );
});
