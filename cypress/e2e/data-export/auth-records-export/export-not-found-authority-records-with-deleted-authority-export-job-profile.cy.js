import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let exportedFileName;
const authorityUUIDsFileName = `AT_C446016_authorityUUIDs_${getRandomPostfix()}.csv`;
const numberOfUuids = 3;
const nonexistentAuthorityUUIDs = Array.from({ length: numberOfUuids }, () => uuid());
const deletedAuthorityExportProfile = 'Deleted authority';

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(
          `cypress/fixtures/${authorityUUIDsFileName}`,
          nonexistentAuthorityUUIDs.join('\n'),
        );

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
    });

    it(
      'C446016 Export not found Authority records with Deleted authority export job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446016'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button and submitting the CSV file
        ExportFileHelper.uploadFile(authorityUUIDsFileName);

        // Step 2-4: Run the "Deleted authority export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          deletedAuthorityExportProfile,
          'Authorities',
        );
        DataExportLogs.verifyAreYouSureModalAbsent();
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            exportedFileName,
            numberOfUuids,
            jobId,
            user.username,
            deletedAuthorityExportProfile,
          );

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          // Step 5: Click on the row with failed data export job at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(exportedFileName);

          const regexParts = nonexistentAuthorityUUIDs.map(
            (nonexistentAuthorityUUID) => `(?=.*${nonexistentAuthorityUUID})`,
          );
          const regexPattern = `${formattedDateUpToHours}.*ERROR Record not found: ${regexParts.join('')}`;
          const regex = new RegExp(regexPattern);

          DataExportLogs.verifyErrorTextInErrorLogsPane(regex);
        });
      },
    );
  });
});
