import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs from '../../../support/fragments/data-export/dataExportViewAllLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let exportedFileName;
const fileName = `AT_C350538_InvalidUUIDs_${getRandomPostfix()}.csv`;
const invalidUUIDs = [
  'invalid-uuid-format',
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
];

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(`cypress/fixtures/${fileName}`, invalidUUIDs.join('\n'));

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    it(
      'C350538 Negative: Verify Holdings export using Invalid Holdings UUIDs (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350538'] },
      () => {
        // Step 1: Go to the "Data Export" app (already navigated in before hook)
        DataExportViewAllLogs.verifyLogsTable();

        // Step 2: Trigger the data export by submitting .csv file with invalid holdings UUIDs
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 3: Run Default holdings export job profile (Specify holdings UUID type on modal)
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED|FAIL/).as(
          'getJobInfo',
        );
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            exportedFileName,
            invalidUUIDs.length,
            jobId,
            user.username,
            'Default holdings',
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Click on the row with failed file at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(exportedFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR Invalid UUID format: ${invalidUUIDs[0]}`),
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR Record not found: ${invalidUUIDs[1]}, ${invalidUUIDs[2]}.`,
            ),
          );
        });
      },
    );
  });
});
