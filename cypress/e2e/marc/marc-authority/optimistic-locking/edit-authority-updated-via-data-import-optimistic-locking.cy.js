import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataExportLogs from '../../../../support/fragments/data-export/dataExportLogs';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();
      const naturalId = `353224${randomNDigitNumber(19)}`;
      const namesPrefix = 'AT_C353224';
      const headingPrefix = `${namesPrefix}_MarcAuthority_${randomPostfix}`;

      const testData = {
        tag010: '010',
        tag100: '100',
        authHeading: `${headingPrefix}`,
        authHeadingUpdatedByA: `${headingPrefix} Updated by A`,
        authHeadingImported: `${headingPrefix} UPD`,
        csvFile: `${namesPrefix}_exportedCSVFile${randomPostfix}.csv`,
        exportedMarcFile: `${namesPrefix}_exportedMarcFile${randomPostfix}.mrc`,
        editedFileNameForUpdate: `${namesPrefix}_editedMarcFile${randomPostfix}.mrc`,
        uploadedMarcFile: `${namesPrefix}_uploadMarcFile${randomPostfix}.mrc`,
      };

      const mappingProfile = {
        name: `${namesPrefix} Update MARC authority records ${randomPostfix}`,
      };
      const actionProfile = {
        name: `${namesPrefix} Update MARC authority records ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const matchProfile = {
        profileName: `${namesPrefix} Update MARC authority records by matching 010 $a ${randomPostfix}`,
        incomingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        existingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const jobProfile = {
        profileName: `${namesPrefix} Update MARC authority records by matching 010 $a ${randomPostfix}`,
      };

      let authorityId;
      let userA;
      let userB;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`${namesPrefix}_`);

        // Create update profiles
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then((mappingProfileResponse) => {
            mappingProfile.id = mappingProfileResponse.body.id;
          })
          .then(() => {
            NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
              (actionProfileResponse) => {
                actionProfile.id = actionProfileResponse.body.id;
              },
            );
          })
          .then(() => {
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            });
          })
          .then(() => {
            return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        // Create MARC authority with 010 field (used for matching) and 100 heading
        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            {
              tag: testData.tag010,
              content: `$a ${naturalId}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: `$a ${testData.authHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
            FileManager.createFile(`cypress/fixtures/${testData.csvFile}`, id);
          });
        })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.dataExportViewAddUpdateProfiles.gui,
            ]).then((userProperties) => {
              userA = userProperties;
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.settingsDataImportCanViewOnly.gui,
            ]).then((userProperties) => {
              userB = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        FileManager.deleteFile(`cypress/fixtures/${testData.editedFileNameForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
      });

      it(
        'C353224 Editing the "MARC Authority" record updated via "Data import" app (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353224'] },
        () => {
          // Steps 1-3: User A logs in and exports the authority record to .mrc via Data Export
          cy.login(userA.username, userA.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.uploadFile(testData.csvFile);
          ExportFile.exportWithDefaultJobProfile(
            testData.csvFile,
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY.split(' export')[0],
            'Authorities',
          );
          ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

          // Edit the exported .mrc file — update the 1XX heading with " UPD" suffix
          DataImport.editMarcFile(
            testData.exportedMarcFile,
            testData.editedFileNameForUpdate,
            [testData.authHeading],
            [testData.authHeadingImported],
          );

          // Step 4: User A goes back to MARC authorities and opens the record for editing
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBeats(testData.authHeading);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Steps 5-7 (User B tab): Import the updated .mrc file via API (admin)
          // while User A remains in the quickMARC editor
          cy.then(() => {
            cy.getToken(userB.username, userB.password);
            DataImport.uploadFileViaApi(
              testData.editedFileNameForUpdate,
              testData.uploadedMarcFile,
              jobProfile.profileName,
            );
          })
            .then(() => {
              // Wait until the import has actually updated the authority record
              cy.recurse(
                () => cy.getMarcRecordDataViaAPI(authorityId),
                (marcData) => {
                  const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                  return field100 && field100.content.includes(testData.authHeadingImported);
                },
                { limit: 17, timeout: 40000, delay: 2000 },
              );
            })
            .then(() => {
              // Restore User A's token so the UI session continues as User A
              cy.getToken(userA.username, userA.password);

              // Step 12: User A edits the 100 field
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                `$a ${testData.authHeadingUpdatedByA}`,
              );
              QuickMarcEditor.checkContentByTag(
                testData.tag100,
                `$a ${testData.authHeadingUpdatedByA}`,
              );

              // Step 13: User A clicks "Save & close" — triggers optimistic locking conflict
              // because the import has already updated the record to a newer version
              QuickMarcEditor.pressSaveAndCloseButton();

              // Step 13 (expected): Conflict detection banner is displayed
              QuickMarcEditor.verifyOptimisticLockingBanner();

              // Step 14: User A clicks "View latest version" link
              QuickMarcEditor.clickViewLatestVersionLink();

              // Step 14 (expected): Detail view shows the imported (User B's) changes;
              // User A's edits are NOT applied
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.authHeadingImported);
              MarcAuthority.notContains(testData.authHeadingUpdatedByA);
            });
        },
      );
    });
  });
});
