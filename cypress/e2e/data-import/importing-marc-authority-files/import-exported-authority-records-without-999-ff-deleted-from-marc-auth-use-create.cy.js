import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const authorityHeadingPrefix = `AT_C353579_MarcAuthority_${randomPostfix}`;
    const csvFile = `AT_C353579_authorityUUIDs_${randomPostfix}.csv`;
    const exportedMarcFile = `AT_C353579_exportedMarcFile_${randomPostfix}.mrc`;
    const reimportFile = `AT_C353579_reimportFile_${randomPostfix}.mrc`;

    const authorityFields = [
      [{ tag: '100', content: `$a ${authorityHeadingPrefix}_1`, indicators: ['1', '\\'] }],
      [{ tag: '110', content: `$a ${authorityHeadingPrefix}_2`, indicators: ['2', '\\'] }],
      [{ tag: '130', content: `$a ${authorityHeadingPrefix}_3`, indicators: ['\\', '0'] }],
    ];
    const authData = {
      prefix: getRandomLetters(15),
      startWithNumber: 1,
    };
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

    let user;
    const authorityIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C353579_');

      cy.then(() => {
        // Create 3 MARC authority records via API, each with a different UUID
        authorityFields.forEach((fieldSet, index) => {
          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startWithNumber + index}`,
            fieldSet,
          ).then((id) => authorityIds.push(id));
        });
      })
        .then(() => {
          // Export the 3 created authority records via API
          FileManager.createFile(`cypress/fixtures/${csvFile}`, authorityIds.join('\n'));
        })
        .then(() => {
          ExportFile.exportFileViaApi(
            csvFile,
            'authority',
            'Default authority export job profile',
          ).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFile);
          });
        })
        .then(() => {
          // Verify the exported ".mrc" file contains the correct headings and 999 ff UUIDs
          const assertionsOnMarcFileContent = authorityIds.map((id, index) => ({
            uuid: id,
            assertions: [
              (record) => expect([
                record.get('999')[0].subf[0][1],
                record.get('999')[0].subf[1][1],
              ]).to.include(id),
              (record) => expect(record.get(authorityFields[index][0].tag)[0].subf[0][1]).to.eq(
                `${authorityHeadingPrefix}_${index + 1}`,
              ),
            ],
          }));
          return parseMrcFileContentAndVerify(
            exportedMarcFile,
            assertionsOnMarcFileContent,
            authorityIds.length,
            false,
          );
        })
        .then(() => {
          // Remove "999" field from each record in the exported file
          return DataImport.removeMarcFieldFromAllRecords(exportedMarcFile, reimportFile, '999');
        })
        .then(() => {
          // Delete the exported authority records via API
          authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
          cy.recurse(
            () => MarcAuthorities.getMarcAuthoritiesViaApi({
              query: `(${authorityIds.map((id) => `id=="${id}"`).join(' or ')})`,
            }),
            (found) => found.length === 0,
            { limit: 10, timeout: 12000, delay: 1000 },
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      // Guard in case the mid-before-hook API deletion above did not run
      authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      // Delete the newly created (re-imported) authority records
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C353579_');

      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${reimportFile}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
    });

    it(
      'C353579 Import exported records, which have been deleted via "MARC Authority" app without 999 field values. Use Create action (promin)',
      { tags: ['extendedPath', 'promin', 'C353579'] },
      () => {
        // Steps 18-20: Import the ".mrc" file (999 fields stripped) using "Default - Create SRS MARC Authority"
        DataImport.verifyUploadState();
        DataImport.uploadFile(reimportFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(reimportFile);
        Logs.checkJobStatus(reimportFile, JOB_STATUS_NAMES.COMPLETED);

        // Step 21: SRS MARC and Authority columns show "Created" for all 3 records
        Logs.openFileDetails(reimportFile);
        [0, 1, 2].forEach((rowIndex) => {
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.authority,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, rowIndex);
          });
        });

        // Step 22-23: Open the first created record from the import log - heading matches
        const headings = [1, 2, 3].map((index) => `${authorityHeadingPrefix}_${index}`);
        FileDetails.openAuthorityByTitle(headings[0], RECORD_STATUSES.CREATED);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(`$a ${headings[0]}`);

        // Steps 24-25 (remaining records): verify via search in "MARC Authority" app
        headings.slice(1).forEach((heading) => {
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, heading);
          MarcAuthorities.selectIncludingTitle(heading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`$a ${heading}`);
        });
      },
    );
  });
});
