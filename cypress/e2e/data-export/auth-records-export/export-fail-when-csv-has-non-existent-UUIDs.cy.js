import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

describe('Data Export', () => {
  describe('Authority records export', () => {
    const testData = {
      authorityUUIDsFileName: `AT_C353209_authorityUUIDs_${getRandomPostfix()}.csv`,
    };
    const defaultAuthorityExportProfile = 'Default authority';
    let exportedFileName;
    let user;

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;

          // Create a CSV file with random non-existent UUIDs
          const randomUUIDs = [uuid(), uuid()].join('\n');
          FileManager.createFile(
            `cypress/fixtures/${testData.authorityUUIDsFileName}`,
            randomUUIDs,
          );

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        },
      );
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C353209 Export failed when using ".csv" file with non-existent UUIDs (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353209'] },
      () => {
        // Trigger the data export by uploading the CSV file with UUIDs
        ExportFileHelper.uploadFile(testData.authorityUUIDsFileName);

        // Run with Default authority export job profile
        ExportFileHelper.exportWithDefaultJobProfile(
          testData.authorityUUIDsFileName,
          defaultAuthorityExportProfile,
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${testData.authorityUUIDsFileName.replace('.csv', '')}-${jobId}.mrc`;

          // Verify the job completed with "Fail" status
          DataExportResults.verifyFailedExportResultCells(
            exportedFileName,
            2,
            jobId,
            user.username,
            defaultAuthorityExportProfile,
          );

          // Click on the failed job row to see error messages
          DataExportLogs.clickFileNameFromTheList(exportedFileName);
          DataExportLogs.verifyErrorTextInErrorLogsPane('Record not found');
          DataExportLogs.verifyErrorTextInErrorLogsPane('Failed records number: 2');
        });
      },
    );
  });
});
