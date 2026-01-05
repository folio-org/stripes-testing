import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';

let user;
let exportedMrcFileName;
let createdAuthorityId;
const randomPostfix = getRandomPostfix();
const marcFile = {
  marc: 'marcAuthFileC895649.mrc',
  fileNameImported: `testMarcFileC895649.${randomPostfix}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
};
const marcAuthority = {
  title: 'AT_C895649 Clovio, Giulio,',
};
const importedMarcAuthorityTitle = 'AT_C895649 IMPORTED Clovio, Giulio,';
const exportedFileFromApi = `AT_C895649_api_export_${randomPostfix}.mrc`;
const exportedFileFromApiSuppressed = `AT_C895649_api_suppressed_${randomPostfix}.mrc`;

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.moduleDataImportEnabled.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C895649');

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileNameImported,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthority.id = record.authority.id;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      MarcAuthorities.deleteViaAPI(marcAuthority.id);
      if (createdAuthorityId) {
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      }
      FileManager.deleteFile(`cypress/fixtures/${exportedFileFromApi}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileFromApiSuppressed}`);
      FileManager.deleteFileFromDownloadsByMask(exportedMrcFileName);
      FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
    });

    it(
      'C895649 Verify suppress999ff parameter of /data-export/download-record/{recordId} endpoint for Authority records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C895649'] },
      () => {
        // Step 1: Send GET request /data-export/download-record/{recordId} with idType=AUTHORITY and suppress999ff=true
        cy.getAdminToken();
        cy.downloadDataExportRecordViaApi(marcAuthority.id, 'AUTHORITY', {
          suppress999ff: 'true',
        }).then((body) => {
          cy.wrap(body).should('not.include', marcAuthority.id);

          // Step 2: Save the response to .mrc file
          FileManager.createFile(`cypress/fixtures/${exportedFileFromApiSuppressed}`, body);
          DataImport.editMarcFile(
            exportedFileFromApiSuppressed,
            exportedFileFromApiSuppressed,
            [marcAuthority.title],
            [importedMarcAuthorityTitle],
          );
        });

        // Step 3: From Data import app - Upload suppressed .mrc file and create authority record
        cy.getUserToken(user.username, user.password);
        DataImport.verifyUploadState();
        DataImport.uploadFileViaApi(
          exportedFileFromApiSuppressed,
          exportedFileFromApiSuppressed,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          createdAuthorityId = response[0].authority.id;
        });
        Logs.checkJobStatus(exportedFileFromApiSuppressed, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(exportedFileFromApiSuppressed);
        Logs.clickOnHotLink(0, 6, RECORD_STATUSES.CREATED);
        MarcAuthority.contains(importedMarcAuthorityTitle);

        // Step 4: Send GET request with suppress999ff=false
        cy.getAdminToken();
        cy.downloadDataExportRecordViaApi(marcAuthority.id, 'AUTHORITY', {
          suppress999ff: 'false',
        }).then((body) => {
          cy.wrap(body).should('include', marcAuthority.id);

          // Step 5: Save the response to .mrc file
          FileManager.createFile(`cypress/fixtures/${exportedFileFromApi}`, body);
        });

        // Step 6: From MARC authority app - Export authority (MARC)
        cy.getUserToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy('Keyword', marcAuthority.title);
        MarcAuthorities.selectIncludingTitle(marcAuthority.title);
        MarcAuthority.waitLoading();

        cy.intercept('/data-export/quick-export').as('quickExport');
        MarcAuthority.exportMarc();
        MarcAuthorities.verifyToastNotificationAfterExportAuthority();

        // Step 7: Go to Data export app and download auto-generated .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedMrcFileName = `quick-export-${jobId}.mrc`;

          DataExportLogs.clickButtonWithText(exportedMrcFileName);

          // Step 8: Compare records from Step 5 (API) and Step 7 (Quick Export)
          FileManager.findDownloadedFilesByMask(exportedMrcFileName).then((downloadedFiles) => {
            const quickExportFile = downloadedFiles[0];

            FileManager.verifyFilesHaveEqualContent(
              quickExportFile,
              `cypress/fixtures/${exportedFileFromApi}`,
            );
          });
        });
      },
    );
  });
});
