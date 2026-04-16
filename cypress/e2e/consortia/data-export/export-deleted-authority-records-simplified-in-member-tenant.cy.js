import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import { getLongDelay } from '../../../support/utils/cypressTools';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let exportedFileName;
let createdAuthoritySourceFileId;
const title = `AT_C566113_MarcAuthority_${getRandomPostfix()}`;
const deletedMarcAuthIds = [];
const authFile = {
  sourceName: `AT_C566113_AuthoritySourceFile_${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const authorityFields = [{ tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] }];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;

        // Affiliate user to College (Member) tenant with required permissions
        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [permissions.dataExportUploadExportDownloadFileViewLogs.gui],
        });

        cy.createAuthoritySourceFileUsingAPI(
          authFile.prefix,
          authFile.startWithNumber,
          authFile.sourceName,
        ).then((authoritySourceFileId) => {
          createdAuthoritySourceFileId = authoritySourceFileId;

          cy.setTenant(Affiliations.College);

          // Create 6 authority records
          for (let i = 0; i < 6; i++) {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authFile.prefix,
              authFile.hridStartsWith,
              authorityFields,
            ).then((createdRecordId) => {
              deletedMarcAuthIds.push(createdRecordId);
            });
          }
        });

        // Wait for all records to be created, then delete them
        cy.wait(3000);
        cy.wrap(deletedMarcAuthIds).each((recordId) => {
          MarcAuthority.deleteViaAPI(recordId);
        });
        cy.resetTenant();

        cy.login(user.username, user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C566113 ECS | Simplified export of deleted Authority records with Deleted profile in Member tenant (consortia) (firebird)',
      { tags: ['smokeECS', 'firebird', 'C566113'] },
      () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        // Step 1: Send POST request to trigger simplified export with offset and limit
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const queryDate = currentDate.toISOString().split('.')[0];

        cy.runDataExportAuthorityDeleted(`updatedDate > ${queryDate}`, '1', 5).then((response) => {
          const jobExecutionId = response.body.jobExecutionId;

          expect(response.status).to.equal(200);
          expect(jobExecutionId).to.be.a('string');

          // Step 2: Verify job triggered and running - wait for job to appear in logs
          cy.wait(5000);

          // Step 3: Verify job completed successfully
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then((interception) => {
            const job = interception.response.body.jobExecutions.find(
              (jobExecution) => jobExecution.id === jobExecutionId,
            );
            exportedFileName = job.exportedFiles[0].fileName;
            const recordsCount = 5;
            const jobId = job.hrId;

            // Verify export results - status Completed (not Completed with errors)
            cy.resetTenant();
            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              Cypress.env('diku_login'),
              'Deleted authority',
            );

            cy.getUserToken(user.username, user.password);
            cy.setTenant(Affiliations.College);

            // Verify file name pattern
            expect(exportedFileName).to.include(`deleted-authority-records-${jobId}.mrc`);

            // Step 4: Download exported file
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Step 5: Verify exported records in MRC file - should contain exactly 5 records
            ExportFile.verifyMrcFileRecordsCount(exportedFileName, 5);
          });
        });
      },
    );
  });
});
