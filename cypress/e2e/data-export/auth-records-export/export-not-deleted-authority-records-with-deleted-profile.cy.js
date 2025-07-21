/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let exportedFileName;
let authorityUUIDsFileName;
let createdAuthoritySourceFileId;
const authFile = {
  sourceName: `AT_C446012_AuthoritySourceFile_${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const authorityInstance = {
  title: `AT_C446012_MarcAuthority_${getRandomPostfix()}`,
};
const authorityFields = [
  { tag: '100', content: `$a ${authorityInstance.title}`, indicators: ['\\', '\\'] },
];
const deletedAuthorityExportProfile = 'Deleted authority';

describe('Data Export', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      // Create a new authority source file
      cy.createAuthoritySourceFileUsingAPI(
        authFile.prefix,
        authFile.startWithNumber,
        authFile.sourceName,
      ).then((authoritySourceFileId) => {
        createdAuthoritySourceFileId = authoritySourceFileId;
        // Create a new MARC authority record with the source file code as prefix
        MarcAuthorities.createMarcAuthorityViaAPI(
          authFile.prefix,
          authFile.hridStartsWith,
          authorityFields,
        ).then((createdRecordId) => {
          authorityInstance.id = createdRecordId;
          authorityUUIDsFileName = `AT_C446012_authorityUUIDs_${getRandomPostfix()}.csv`;

          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityInstance.id,
          );
        });
      });
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    MarcAuthority.deleteViaAPI(authorityInstance.id);
    cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
  });

  it(
    'C446012 Export not deleted Authority records with "Deleted authority export job profile" (firebird)',
    { tags: ['criticalPath', 'firebird', 'C446012'] },
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
          1,
          jobId,
          user.username,
          deletedAuthorityExportProfile,
        );

        const date = new Date();
        const formattedDateUpToHours = date.toISOString().slice(0, 13);

        // Step 5: Click on the row with failed data export job at the "Data Export" logs table
        DataExportLogs.clickFileNameFromTheList(exportedFileName);
        DataExportLogs.verifyErrorTextInErrorLogsPane(
          new RegExp(
            `${formattedDateUpToHours}.*ERROR This profile can only be used to export authority records set for deletion`,
          ),
        );
      });
    },
  );
});
