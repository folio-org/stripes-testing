/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let exportedFileName;
let createdAuthoritySourceFileId;
const authorityUUIDsFileName = `AT_C446015_authorityUUIDs_${getRandomPostfix()}.csv`;
const recordsCount = 1;
const authFile = {
  sourceName: `AT_C446015_AuthoritySourceFile_${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const authorityInstance = {
  title: `AT_C446015_MarcAuthority_${getRandomPostfix()}`,
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
      permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
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

          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityInstance.id,
          );

          MarcAuthorities.getMarcAuthoritiesViaApi({
            query: `id="${authorityInstance.id}"`,
          }).then((authorities) => {
            authorityInstance.naturalId = authorities[0].naturalId;
          });
        });
      });
      cy.login(user.username, user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(exportedFileName);
  });

  it(
    'C446015 Delete Authority record and export it with Deleted authority export job profile (firebird)',
    { tags: ['criticalPath', 'firebird', 'C446015'] },
    () => {
      // Step 1-3: Delete the MARC authority record
      MarcAuthorities.searchBeats(authorityInstance.title);
      MarcAuthorities.select(authorityInstance.title);
      MarcAuthority.delete();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.verifyDeleteComplete(authorityInstance.title);

      // Step 4-8: Upload the .csv file
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      ExportFileHelper.uploadFile(authorityUUIDsFileName);
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

        DataExportResults.verifySuccessExportResultCells(
          exportedFileName,
          recordsCount,
          jobId,
          user.username,
          deletedAuthorityExportProfile,
        );

        // Step 9: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
        DataExportLogs.clickButtonWithText(exportedFileName);

        // Step 10: Check exported records included in the file
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
        const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
        const assertionsOnMarcFileContent = [
          {
            uuid: authorityInstance.id,
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
              (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityInstance.id),
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          exportedFileName,
          assertionsOnMarcFileContent,
          recordsCount,
          false,
          true,
        );
      });
    },
  );
});
