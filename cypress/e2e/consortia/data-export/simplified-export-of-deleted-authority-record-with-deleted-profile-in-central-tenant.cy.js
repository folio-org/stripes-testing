import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { tenantNames } from '../../../support/dictionary/affiliations';
import { getLongDelay } from '../../../support/utils/cypressTools';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import FileManager from '../../../support/utils/fileManager';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
let createdAuthorityId;
const title = `C566114 Test title ${getRandomPostfix()}`;
const localAuthFiles = {
  sourceName: `C566114 auth source file active ${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const authorityFields = [{ tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] }];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.dataExportViewOnly.gui]).then((userProperties) => {
        user = userProperties;

        // create new authority source file to use its unique name in the query
        cy.createAuthoritySourceFileUsingAPI(
          localAuthFiles.prefix,
          localAuthFiles.startWithNumber,
          localAuthFiles.sourceName,
        ).then((authoritySourceFileId) => {
          localAuthFiles.id = authoritySourceFileId;
        });
        // create authority record
        MarcAuthorities.createMarcAuthorityViaAPI(
          localAuthFiles.prefix,
          localAuthFiles.hridStartsWith,
          authorityFields,
        ).then((createdRecordId) => {
          createdAuthorityId = createdRecordId;
          cy.wait(3000);
          // delete authority record
          MarcAuthority.deleteViaAPI(createdAuthorityId);
        });
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.deleteAuthoritySourceFileViaAPI(localAuthFiles.id, true);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C566114 ECS | Simplified export of deleted Authority records with Deleted profile in Central tenant (consortia) (firebird)',
      { tags: ['smokeECS', 'firebird', 'C566114'] },
      () => {
        cy.getAdminToken();
        cy.runDataExportAuthorityDeleted(
          `authoritySourceFile.name=${localAuthFiles.sourceName}`,
        ).then((response) => {
          const jobExecutionId = response.body.jobExecutionId;

          expect(response.status).to.equal(200);
          expect(jobExecutionId).to.be.a('string');

          // collect expected results and verify actual result
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then((interception) => {
            const job = interception.response.body.jobExecutions.find(
              (jobExecution) => jobExecution.id === jobExecutionId,
            );
            exportedFileName = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              Cypress.env('diku_login'),
              'Deleted authority',
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            cy.expect(exportedFileName).to.include('deleted-authority-records');

            const assertionsOnFileContent = [
              {
                uuid: createdAuthorityId,
                assertions: [
                  (record) => expect(record.get('100')[0].subf[0][0]).to.eq('a'),
                  (record) => expect(record.get('100')[0].subf[0][1]).to.eq(title),
                  (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                  (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                  (record) => expect(record.get('999')[0].subf[1][1]).to.eq(createdAuthorityId),
                ],
              },
            ];

            parseMrcFileContentAndVerify(exportedFileName, assertionsOnFileContent, 1, true, true);
          });
        });
      },
    );
  });
});
