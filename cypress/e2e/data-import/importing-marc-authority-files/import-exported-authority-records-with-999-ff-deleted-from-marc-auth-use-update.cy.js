import { EXISTING_RECORD_NAMES, RECORD_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const authorityHeadingPrefix = `AT_C407006_MarcAuthority_${randomPostfix}`;
    const csvFile = `AT_C407006_authorityUUIDs_${randomPostfix}.csv`;
    const exportedMarcFile = `AT_C407006_exportedMarcFile_${randomPostfix}.mrc`;

    const authorityFields = [
      [{ tag: '100', content: `$a ${authorityHeadingPrefix} 1`, indicators: ['1', '\\'] }],
      [{ tag: '110', content: `$a ${authorityHeadingPrefix} 2`, indicators: ['2', '\\'] }],
      [{ tag: '130', content: `$a ${authorityHeadingPrefix} 3`, indicators: ['\\', '0'] }],
    ];
    const authData = {
      prefix: getRandomLetters(15),
      startWithNumber: 1,
    };

    const mappingProfile = { name: `AT_C407006_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C407006_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C407006_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      profileName: `AT_C407006_Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };

    let user;
    const authorityIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407006_');

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
          // Create Update job profile matching by "999 ff $s" (per TestRail precondition)
          NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              mappingProfile.id = mappingProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
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
                `${authorityHeadingPrefix} ${index + 1}`,
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
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
      // Guard in case the mid-before-hook API deletion above did not run
      authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));

      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
    });

    it(
      'C407006 Update deleted records using exported records, by matching "999 ff $s" subfields (promin)',
      { tags: ['extendedPath', 'promin', 'C407006'] },
      () => {
        // Steps 16-18: Import the exported ".mrc" file using the "Update ... 999 ff $s" job profile
        DataImport.uploadFile(exportedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(exportedMarcFile);

        // Step 19: SRS column shows "No action" for all 3 records - nothing was created
        Logs.openFileDetails(exportedMarcFile);
        [0, 1, 2].forEach((rowIndex) => {
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.NO_ACTION,
            FileDetails.columnNameInResultList.srsMarc,
            rowIndex,
          );
        });
      },
    );
  });
});
