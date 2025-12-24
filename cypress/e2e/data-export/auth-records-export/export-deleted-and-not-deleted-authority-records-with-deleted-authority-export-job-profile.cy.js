/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';

let user;
let exportedFileName;
const authorityInstanceIds = [];
const authorityUUIDsFileName = `AT_C446014_authorityUUIDs_${getRandomPostfix()}.csv`;
const deletedRecordsCount = 1;
const notDeletedRecordsCount = 1;
const totalRecordsCount = deletedRecordsCount + notDeletedRecordsCount;
const authorityInstance = {
  title: 'AT_C446014_MarcAuthority_1',
};
const deletedAuthorityExportProfile = 'Deleted authority';
const marcAuthFiles = [
  {
    marc: 'marcAuthFileC446014_1.mrc',
    fileName: `testMarcAuthC446014File_1.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  },
  {
    marc: 'marcAuthFileC446014_2.mrc',
    fileName: `testMarcAuthC446014File_2.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  },
];

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          marcAuthFiles.forEach((authFile) => {
            DataImport.uploadFileViaApi(
              authFile.marc,
              authFile.fileName,
              authFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                authorityInstanceIds.push(record.authority.id);
              });
            });
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityInstanceIds.join('\n'),
          );

          MarcAuthorities.getMarcAuthoritiesViaApi({
            query: `id="${authorityInstanceIds[0]}"`,
          }).then((authorities) => {
            authorityInstance.naturalId = authorities[0].naturalId;
          });

          MarcAuthority.deleteViaAPI(authorityInstanceIds[0]);

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      MarcAuthority.deleteViaAPI(authorityInstanceIds[1]);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C446014 Export not deleted and deleted Authority records with "Deleted authority export job profile" (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446014'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button and submitting the CSV file
        ExportFileHelper.uploadFile(authorityUUIDsFileName);

        // Step 2-4: Run the "Deleted authority export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          deletedAuthorityExportProfile,
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            exportedFileName,
            totalRecordsCount,
            notDeletedRecordsCount,
            jobId,
            user,
            deletedAuthorityExportProfile,
          );

          // Step 5: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 6: Check exported records included in the file
          const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
          const assertionsOnMarcFileContent = [
            {
              uuid: authorityInstanceIds[0],
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')[0].value).to.eq(authorityInstance.naturalId),
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                (record) => {
                  expect(record.get('008')[0].value).to.eq(
                    '900423n| azannaabn          |n aaa      ',
                  );
                },
                (record) => expect(record.get('100')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('100')[0].subf[0][1]).to.eq(authorityInstance.title),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityInstanceIds[0]),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            notDeletedRecordsCount,
            false,
          );

          // Step 7: Click on the row with completed with errors data export job at the "Data Export" logs table
          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.clickFileNameFromTheList(exportedFileName);
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR This profile can only be used to export authority records set for deletion`,
            ),
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR Record not found: ${authorityInstanceIds[1]}.`,
            ),
          );
        });
      },
    );
  });
});
