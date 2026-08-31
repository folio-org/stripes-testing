import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const authorityHeadingPrefix = `AT_C407008_MarcAuthority_${randomPostfix}`;
    const authorityUUIDsFileName = `AT_C407008_authorityUUIDs_${randomPostfix}.csv`;
    const defaultAuthorityExportProfile = 'Default authority';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const error =
      'A new MARC-Authority was not created because the incoming record already contained a 999ff$s or 999ff$i field';
    const authData = {
      prefix: getRandomLetters(15),
      startWithNumber: 1,
    };

    const authorityFields = [
      [{ tag: '100', content: `$a ${authorityHeadingPrefix} 1`, indicators: ['1', '\\'] }],
      [{ tag: '110', content: `$a ${authorityHeadingPrefix} 2`, indicators: ['2', '\\'] }],
      [{ tag: '130', content: `$a ${authorityHeadingPrefix} 3`, indicators: ['\\', '0'] }],
    ];

    let user;
    let exportedFileName;
    let mrcImportFileName;
    const authorityIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407008_');

      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          authorityFields.forEach((fieldSet, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber + index}`,
              fieldSet,
            ).then((id) => authorityIds.push(id));
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityIds.join('\n'),
          );

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      if (mrcImportFileName) FileManager.deleteFile(`cypress/fixtures/${mrcImportFileName}`);
      if (exportedFileName) FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      Users.deleteViaApi(user?.userId);
      // Guard in case test fails before deletion step
      authorityIds.forEach((id) => MarcAuthorities.deleteViaAPI(id, true));
    });

    it(
      'C407008 Import of exported records with kept "999" field value, which have been deleted from "MARC Authority" app - Use Create action (promin)',
      { tags: ['extendedPath', 'promin', 'C407008'] },
      () => {
        // Steps 4-9: Export selected authority records via Data Export
        ExportFileHelper.uploadFile(authorityUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          defaultAuthorityExportProfile,
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;
          mrcImportFileName = `C407008_reimport_${randomPostfix}.mrc`;

          // Steps 10-11: Download .mrc and verify each record's UUID is in 999 ff field
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            authorityIds.length,
            jobData.hrId,
            user.username,
            defaultAuthorityExportProfile,
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          const assertionsOnMarcFileContent = authorityIds.map((id) => ({
            uuid: id,
            assertions: [
              (record) => expect([
                record.get('999')[0].subf[0][1],
                record.get('999')[0].subf[1][1],
              ]).to.include(id),
            ],
          }));

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            authorityIds.length,
            false,
          );

          // Copy .mrc from downloads to fixtures so it can be re-imported
          cy.readFile(`cypress/downloads/${exportedFileName}`, 'binary').then((fileContent) => {
            cy.writeFile(`cypress/fixtures/${mrcImportFileName}`, fileContent, 'binary');
          });

          // Steps 12-15: Delete all exported authority records via API; wait for deletion
          cy.then(() => {
            authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `keyword="${authorityHeadingPrefix}" and authRefType=="Authorized"`,
              }),
              (found) => found.length === 0,
              { limit: 10, timeout: 12000, delay: 1000 },
            );
          });

          // Steps 16-18: Navigate to Data Import, upload the .mrc with 999 ff fields, run Create profile
          cy.visit(TopMenu.dataImportPath);
          DataImport.waitLoading();
          DataImport.uploadFile(mrcImportFileName, mrcImportFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();

          // Step 18 (expected): Completed with errors
          Logs.waitFileIsImported(mrcImportFileName);
          Logs.checkJobStatus(mrcImportFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);

          // Step 19: Open log — all records have "No action" in SRS column
          Logs.openFileDetails(mrcImportFileName);
          cy.wrap([0, 1, 2]).each((rowIndex) => {
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.NO_ACTION,
              FileDetails.columnNameInResultList.srsMarc,
              rowIndex,
            );
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.ERROR,
              FileDetails.columnNameInResultList.error,
              rowIndex,
            );
          });

          // Step 20: Open JSON view for one error record; verify error message
          FileDetails.openJsonScreen('No content');
          JsonScreenView.verifyJsonScreenIsOpened();
          JsonScreenView.verifyContentInTab(error);
        });
      },
    );
  });
});
