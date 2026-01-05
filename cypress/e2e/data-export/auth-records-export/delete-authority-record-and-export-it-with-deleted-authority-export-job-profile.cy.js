/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
} from '../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';

let user;
let exportedFileName;
const authorityUUIDsFileName = `AT_C446015_authorityUUIDs_${getRandomPostfix()}.csv`;
const recordsCount = 1;
const authorityInstance = {
  title: 'AT_C446015_MarcAuthority',
};
const deletedAuthorityExportProfile = 'Deleted authority';

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('create test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityInstance.title);

      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          'marcAuthFileC446015.mrc',
          `testMarcAuthC446015File.${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          response.forEach((record) => {
            authorityInstance.id = record.authority.id;
          });
          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityInstance.id,
          );

          cy.wait(5000);
          MarcAuthorities.getMarcAuthoritiesViaApi({
            query: `id="${authorityInstance.id}"`,
          }).then((authorities) => {
            authorityInstance.naturalId = authorities[0].naturalId;
          });

          cy.getSrsRecordsByInstanceId(authorityInstance.id).then((srsRecord) => {
            authorityInstance.srsId = srsRecord.id;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
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
          cy.getUserToken(user.username, user.password);
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 10: Check exported records included in the file
          const assertionsOnMarcFileContent = [
            {
              uuid: authorityInstance.id,
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
                      ['i', authorityInstance.id],
                    ],
                  });
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            recordsCount,
            false,
          );
        });
      },
    );
  });
});
