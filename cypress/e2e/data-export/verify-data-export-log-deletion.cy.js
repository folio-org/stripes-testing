import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

let user;
let jobExecutionId;
let jobExecutionHrId;
let resultFileName;
let adminUser;
const fileName = 'empty.csv';

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.dataExportViewOnly.gui]).then((userProperties) => {
      user = userProperties;

      ExportFile.exportFileViaApi(
        fileName,
        'instance',
        'Default instances export job profile',
      ).then((jobExecution) => {
        jobExecutionId = jobExecution.id;
        jobExecutionHrId = jobExecution.hrId;
        resultFileName = jobExecution.exportedFiles[0].fileName;
      });

      cy.getAdminUserDetails().then((adminRecord) => {
        adminUser = adminRecord;
      });

      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C446048 Verify data export log could be deleted from "Logs" table (firebird)',
    { tags: ['extendedPath', 'firebird', 'C446048'] },
    () => {
      // Step 1: Check "Logs" table for data export job from Preconditions
      DataExportResults.verifyFailedExportResultCells(
        resultFileName,
        0,
        jobExecutionHrId,
        adminUser.username,
        'Default instances',
        true,
      );

      // Step 2: Job execution id is already captured during preconditions setup
      // Step 3: Delete data export log by sending DELETE request
      cy.deleteDataExportJobExecutionFromLogs(jobExecutionId).then((response) => {
        expect(response.status).to.equal(204);
      });
      cy.getUserToken(user.username, user.password);

      // Step 4: Check "Logs" table for data export job from Preconditions
      cy.reload();
      DataExportLogs.waitLoading();
      DataExportResults.verifyTableWithResultsExists();
      DataExportLogs.verifyJobAbsentInLogs(resultFileName);
    },
  );
});
