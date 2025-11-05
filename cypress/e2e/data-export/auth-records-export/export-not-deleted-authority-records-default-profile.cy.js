/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

let user;
let exportedFileName;
const recordsCount = 1;
const authorityInstance = {
  title: 'AT_C446006_MarcAuthority',
};
const authorityExportProfile = 'Default authority';
const authorityUUIDsFileName = `AT_C446006_authorityUUIDs_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          'marcAuthFileC446006.mrc',
          `testMarcAuthC446006File.${getRandomPostfix()}.mrc`,
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
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C446006 Export not deleted Authority records with Default authority export job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446006'] },
      () => {
        // Step 1-4: Upload the .csv file
        ExportFileHelper.uploadFile(authorityUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          'Default authority',
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
            authorityExportProfile,
          );

          // Step 5: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 6: Check exported records included in the file
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
                  expect(record.get('008')[0].value).to.eq(
                    '900423n| azannaabn          |n aaa      ',
                  );
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
          );
        });
      },
    );
  });
});
