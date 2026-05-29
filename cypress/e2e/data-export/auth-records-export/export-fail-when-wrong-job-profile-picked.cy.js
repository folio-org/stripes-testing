import Permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Data Export', () => {
  describe('Authority records export', () => {
    const testData = {
      authorityUUIDsFileName: `AT_C350973_authorityUUIDs_${getRandomPostfix()}.csv`,
      holdingsJobProfile: 'Default holdings',
      instancesJobProfile: 'Default instances',
    };
    const createdAuthorityIds = [];
    const authData = {
      prefix: getRandomLetters(15),
      naturalId: `350973${randomNDigitNumber(6)}`,
    };

    let exportedFileNameHoldings;
    let exportedFileNameInstances;
    let user;

    before('Create users, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C350973');

      cy.createTempUser([Permissions.dataExportUploadExportDownloadFileViewLogs.gui])
        .then((userProperties) => {
          user = userProperties;

          const authorityHeadingPrefix = `AT_C350973_MarcAuthority_${getRandomPostfix()}`;
          const createAuthority = (index) => MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.naturalId + index, [
            {
              tag: '100',
              content: `$a ${authorityHeadingPrefix}_${index}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdId) => {
            createdAuthorityIds.push(createdId);
          });

          createAuthority(1);
          createAuthority(2);
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${testData.authorityUUIDsFileName}`,
            createdAuthorityIds.join('\n'),
          );

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      FileManager.deleteFile(`cypress/fixtures/${testData.authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileNameHoldings);
      FileManager.deleteFileFromDownloadsByMask(exportedFileNameInstances);
    });

    it(
      'C350973 Export failed when picked wrong job profile (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350973'] },
      () => {
        // Steps 1-3: Upload CSV and run with "Default holdings export job profile"
        ExportFileHelper.uploadFile(testData.authorityUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          testData.authorityUUIDsFileName,
          testData.holdingsJobProfile,
          'Holdings',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getInfoHoldings',
        );
        cy.wait('@getInfoHoldings', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileNameHoldings = `${testData.authorityUUIDsFileName.replace('.csv', '')}-${jobId}.mrc`;

          // Step 3: Verify the job completed with "Fail" status
          DataExportResults.verifyFailedExportResultCells(
            exportedFileNameHoldings,
            2,
            jobId,
            user.username,
            testData.holdingsJobProfile,
          );

          // Step 4: Click on the failed job row to see the error
          DataExportLogs.clickFileNameFromTheList(exportedFileNameHoldings);
          DataExportLogs.verifyErrorTextInErrorLogsPane('Record not found');
          DataExportLogs.verifyErrorTextInErrorLogsPane('Failed records number: 2');
        });

        // // Step 5: Back to the logs page
        cy.getToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();

        // Steps 6-8: Upload CSV and run with "Default instances export job profile"
        ExportFileHelper.uploadFile(testData.authorityUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          testData.authorityUUIDsFileName,
          testData.instancesJobProfile,
          'Instances',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getInfoInstances',
        );
        cy.wait('@getInfoInstances', getLongDelay()).then((call) => {
          const latestJobExecutions = call.response.body.jobExecutions;
          // Get the most recent failed job (for the instances profile)
          const latestJobData = latestJobExecutions.find(
            ({ runBy, jobProfileName }) => runBy.userId === user.userId && jobProfileName.includes(testData.instancesJobProfile),
          );
          const latestJobId = latestJobData.hrId;
          exportedFileNameInstances = `${testData.authorityUUIDsFileName.replace('.csv', '')}-${latestJobId}.mrc`;

          // Step 8: Verify the job completed with "Fail" status
          DataExportResults.verifyFailedExportResultCells(
            exportedFileNameInstances,
            2,
            latestJobId,
            user.username,
            testData.instancesJobProfile,
          );

          // Step 8: Click on the failed job row to see the error
          DataExportLogs.clickFileNameFromTheList(exportedFileNameInstances);
          DataExportLogs.verifyErrorTextInErrorLogsPane('Record not found');
          DataExportLogs.verifyErrorTextInErrorLogsPane('Failed records number: 2');
        });
      },
    );
  });
});
