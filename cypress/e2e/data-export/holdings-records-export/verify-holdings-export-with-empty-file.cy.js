import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportViewAllLogs from '../../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
const fileName = 'empty.csv';

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C543857 Negative: Verify EXPORT HOLDINGS using empty file (firebird)',
      { tags: ['extendedPath', 'firebird', 'C543857'] },
      () => {
        // Step 1: Go to the Data Export app (already navigated in before hook)
        DataExportViewAllLogs.verifyLogsTable();

        // Step 2: Trigger the data export by submitting empty .csv file
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 3: Run the "Default holdings export job profile" > Specify "Holdings" type > Click "Run"
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        // Step 4: Check the table with data export logs on the "Logs" main page
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const resultFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            0,
            jobId,
            user.username,
            'Default holdings',
            true,
          );

          // Step 5: Click on the row with failed file at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR Error while reading from input file with uuids or file is empty`,
            ),
          );
        });
      },
    );
  });
});
