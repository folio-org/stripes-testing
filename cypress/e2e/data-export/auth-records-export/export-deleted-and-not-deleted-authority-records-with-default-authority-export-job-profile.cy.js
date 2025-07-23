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
import DateTools from '../../../support/utils/dateTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const authorityUUIDsFileName = `AT_C446011_authorityUUIDs_${getRandomPostfix()}.csv`;
let createdAuthoritySourceFileId;
const deletedRecordsCount = 1;
const notDeletedRecordsCount = 1;
const totalRecordsCount = deletedRecordsCount + notDeletedRecordsCount;
const authFile = {
  sourceName: `AT_C446011_AuthoritySourceFile_${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const authorityInstance = {
  title: `AT_C446011_MarcAuthority_${getRandomPostfix()}`,
};
const authorityFields = [
  { tag: '100', content: `$a ${authorityInstance.title}`, indicators: ['\\', '\\'] },
];
const authorityInstanceIds = [];
const defaultAuthorityExportProfile = 'Default authority';

describe('Data Export', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.createAuthoritySourceFileUsingAPI(
        authFile.prefix,
        authFile.startWithNumber,
        authFile.sourceName,
      )
        .then((authoritySourceFileId) => {
          createdAuthoritySourceFileId = authoritySourceFileId;

          for (let i = 0; i < totalRecordsCount; i++) {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authFile.prefix,
              authFile.hridStartsWith,
              authorityFields,
            ).then((createdRecordId) => {
              authorityInstanceIds.push(createdRecordId);
            });
          }
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

          MarcAuthority.deleteViaAPI(authorityInstanceIds[0]);

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    MarcAuthority.deleteViaAPI(authorityInstanceIds[1]);
    cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
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
        DataExportLogs.clickButtonWithText(exportedFileName);

        // Step 6: Check exported records included in the file
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
        const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
        const assertionsOnMarcFileContent = [
          {
            uuid: authorityInstanceIds[1],
            assertions: [
              (record) => expect(record.leader).to.exist,
              (record) => expect(record.get('001')[0].value).to.eq(authorityInstance.naturalId),
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
              (record) => {
                expect(record.get('008')[0].value.startsWith(todayDateYYMMDD)).to.be.true;
              },
              (record) => expect(record.get('100')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('100')[0].subf[0][1]).to.eq(authorityInstance.title),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
              (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityInstanceIds[1]),
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          exportedFileName,
          assertionsOnMarcFileContent,
          notDeletedRecordsCount,
          false,
          true,
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
