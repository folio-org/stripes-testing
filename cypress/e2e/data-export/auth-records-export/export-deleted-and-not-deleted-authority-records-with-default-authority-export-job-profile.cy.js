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
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
} from '../../../support/utils/parseMrcFileContent';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';

let user;
let exportedFileName;
const authorityInstanceIds = [];
const authorityUUIDsFileName = `AT_C446011_authorityUUIDs_${getRandomPostfix()}.csv`;
const deletedRecordsCount = 1;
const notDeletedRecordsCount = 1;
const totalRecordsCount = deletedRecordsCount + notDeletedRecordsCount;
const authorityInstance = {
  title: 'AT_C446011_MarcAuthority',
};
const defaultAuthorityExportProfile = 'Default authority';
const marcAuthFiles = [
  {
    marc: 'marcAuthFileC446011_1.mrc',
    fileName: `testMarcAuthC446011File_1.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  },
  {
    marc: 'marcAuthFileC446011_2.mrc',
    fileName: `testMarcAuthC446011File_2.${getRandomPostfix()}.mrc`,
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
            query: `id="${authorityInstanceIds[1]}"`,
          }).then((authorities) => {
            authorityInstance.naturalId = authorities[0].naturalId;
          });

          cy.getSrsRecordsByInstanceId(authorityInstanceIds[1]).then((srsRecord) => {
            authorityInstance.srsId = srsRecord.id;
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
      'C446011 Export not deleted and deleted Authority records with Default authority export job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446011'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button and submitting the CSV file
        ExportFileHelper.uploadFile(authorityUUIDsFileName);

        // Step 2-4: Run the "Deleted authority export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          defaultAuthorityExportProfile,
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
            defaultAuthorityExportProfile,
          );

          // Step 5: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          cy.getUserToken(user.username, user.password);
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 6: Check exported records included in the file
          const assertionsOnMarcFileContent = [
            {
              uuid: authorityInstanceIds[1],
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => verify001FieldValue(record, authorityInstance.naturalId),
                (record) => verify005FieldValue(record),
                (record) => verify008FieldValue(record, '900423n| azannaabn          |n aaa      '),
                (record) => {
                  verifyMarcFieldByTag(record, '100', {
                    ind1: ' ',
                    ind2: ' ',
                    subf: ['a', authorityInstance.title],
                  });
                },
                (record) => {
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: [
                      ['s', authorityInstance.srsId],
                      ['i', authorityInstanceIds[1]],
                    ],
                  });
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            notDeletedRecordsCount,
          );

          // Step 7: Click on the row with completed with errors data export job at the "Data Export" logs table
          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.clickFileNameFromTheList(exportedFileName);
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR This profile can only be used to export authority records not deleted`,
            ),
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR Record not found: ${authorityInstanceIds[0]}.`,
            ),
          );
        });
      },
    );
  });
});
