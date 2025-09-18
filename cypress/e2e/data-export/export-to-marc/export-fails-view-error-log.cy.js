import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const notFoundUUID = uuid();
const repeteableUUIDs = uuid();
const invalidUUIDFormat = 'invalid-uuid-format-12345';
const invalidUUIDs = [notFoundUUID, repeteableUUIDs, repeteableUUIDs, invalidUUIDFormat];
const csvFileName = `AT_C9291_invalidUUIDs_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(`cypress/fixtures/${csvFileName}`, invalidUUIDs.join('\n'));

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C9291 Export fails - view error log (firebird)',
      { tags: ['extendedPath', 'firebird', 'C9291'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with invalid Instances UUIDs
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the "Default instance export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        // Step 3: Check the table with data export logs on the "Logs" main page
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = invalidUUIDs.length;
          const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          // Verify the job completed with "Fail" status
          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            totalRecordsCount,
            jobId,
            user.username,
            'Default instances',
          );
          cy.getUserToken(user.username, user.password);

          // Step 4: Click on the failed file to view error log
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          // Verify error messages for invalid UUID format and record not found
          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR Invalid UUID format: ${invalidUUIDFormat}`,
            ),
          );

          const regexParts = [notFoundUUID, repeteableUUIDs].map((UUID) => `(?=.*${UUID})`);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR Record not found: ${regexParts.join('')}`),
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR UUID ${repeteableUUIDs} repeated 2 times.`,
            ),
          );
        });

        // Step 5: Navigate back to Data export app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
        DataExportLogs.verifyViewAllLogsButtonEnabled();
        DataExportLogs.verifyRunningAccordionExpanded();
      },
    );
  });
});
