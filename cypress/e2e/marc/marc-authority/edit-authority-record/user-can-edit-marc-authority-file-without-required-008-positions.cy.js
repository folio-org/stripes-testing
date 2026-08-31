import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  APPLICATION_NAMES,
  AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN,
  AUTHORITY_008_FIELD_SOURCE_DROPDOWN,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      // Record 1: 008 will be edited to 41 chars (extra 'n' appended at position 40)
      const heading1 = `AT_C387476_MarcAuthority1_${randomPostfix}`;
      const heading1Updated = `${heading1} more than 40 characters`;

      // Record 2: 008 will be edited to 39 chars (last trailing space removed)
      const heading2 = `AT_C387476_MarcAuthority2_${randomPostfix}`;
      const heading2Updated = `${heading2} less than 40 characters`;

      // Positions 31-39 of authority 008 per valid008FieldValues:
      // RecUpd='a', PersName='a', LevelEst='a', Undef[34-37]='    ', ModRec=' ', Source=' '
      // = 3×'a' + 6×' ' = 9 chars. Unique enough to avoid false matches in ASCII MARC binary.
      const tag008Tail = 'aaa      ';

      const exportedFile1 = `AT_C387476_exported1_${randomPostfix}.mrc`;
      const exportedFile2 = `AT_C387476_exported2_${randomPostfix}.mrc`;
      const combinedFile = `AT_C387476_combined_${randomPostfix}.mrc`;

      const mappingProfile = {
        name: `AT_C387476 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      };
      const actionProfile = {
        name: `AT_C387476 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const matchProfile = {
        profileName: `AT_C387476 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `AT_C387476 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const marcAuthFields1 = [{ tag: '100', content: `$a ${heading1}`, indicators: ['1', '\\'] }];
      const marcAuthFields2 = [{ tag: '100', content: `$a ${heading2}`, indicators: ['1', '\\'] }];

      let user;
      let authorityId1;
      let authorityId2;

      before('Create test data, export, edit 008, import via API, login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C387476_');

        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then((fmpResponse) => {
            mappingProfile.id = fmpResponse.body.id;
            return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
          })
          .then((apResponse) => {
            actionProfile.id = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            );
          })
          .then((mpResponse) => {
            matchProfile.id = mpResponse.body.id;
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });

        // Steps 2-3: Create record 1 via API, export, edit 008 to 41 chars and update heading
        MarcAuthorities.createMarcAuthorityViaAPI(
          `${randomDigits}387476_1`,
          '',
          marcAuthFields1,
        ).then((id) => {
          authorityId1 = id;
          cy.downloadDataExportRecordViaApi(id, 'AUTHORITY').then((body) => {
            FileManager.createFile(`cypress/fixtures/${exportedFile1}`, body);
            // Add 'n' after the 9-char 008 tail → 008 becomes 41 bytes
            DataImport.editMarcFile(
              exportedFile1,
              exportedFile1,
              [heading1, tag008Tail],
              [heading1Updated, `${tag008Tail}n`],
            );
          });
        });

        // Create record 2 via API, export, edit 008 to 39 chars and update heading
        MarcAuthorities.createMarcAuthorityViaAPI(
          `${randomDigits}387476_2`,
          '',
          marcAuthFields2,
        ).then((id) => {
          authorityId2 = id;
          cy.downloadDataExportRecordViaApi(id, 'AUTHORITY').then((body) => {
            FileManager.createFile(`cypress/fixtures/${exportedFile2}`, body);
            // Remove the last trailing space → 008 becomes 39 bytes
            DataImport.editMarcFile(
              exportedFile2,
              exportedFile2,
              [heading2, tag008Tail],
              [heading2Updated, tag008Tail.slice(0, -1)],
            );
          });
        });

        // Combine both single-record files into one two-record .mrc file
        cy.then(() => {
          cy.readFile(`cypress/fixtures/${exportedFile1}`).then((content1) => {
            cy.readFile(`cypress/fixtures/${exportedFile2}`).then((content2) => {
              FileManager.createFile(`cypress/fixtures/${combinedFile}`, content1 + content2);
            });
          });
        });

        // Steps 4-5: Upload combined file via API with user token; login to Data Import
        cy.then(() => {
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(combinedFile, combinedFile, jobProfile.profileName);
          cy.login(user.username, user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user?.userId);
        if (authorityId1) MarcAuthority.deleteViaAPI(authorityId1, true);
        if (authorityId2) MarcAuthority.deleteViaAPI(authorityId2, true);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile1}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile2}`);
        FileManager.deleteFile(`cypress/fixtures/${combinedFile}`);
      });

      it(
        'C387476 User can edit updated "MARC authority" file without required number (40) of "008" positions (promin)',
        { tags: ['extendedPath', 'promin', 'C387476'] },
        () => {
          // Steps 5-6: Verify import completed; open file details; both records show Updated
          Logs.checkJobStatus(combinedFile, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(combinedFile);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.authority,
          );

          // Step 7: Open record 1 (41-char 008) → MARC Authority detail view
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBeats(heading1Updated);
          MarcAuthorities.selectTitle(heading1Updated);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(heading1Updated);
          // Best guess: 41-char 008 ends with the extra 'n' character at position 40
          MarcAuthority.contains(`${tag008Tail}n`);
          MarcAuthority.contains('008\\t.{41}$', { regexp: true });

          // Step 8: Open edit → QuickMARC shows 008 boxes
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.GEOSUBD,
            AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN.N,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.SL,
          );

          // Step 9: Reset all 008 dropdowns to valid values,
          // update 100 field, save & close → detail view shown
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.NO,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.NO,
          );
          QuickMarcEditor.updateExistingField('100', `$a ${heading1Updated} edited`);
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${heading1Updated} edited`);
          MarcAuthority.closeAuthorityViewPane();

          // Steps 10, 11: Open record 2 (39-char 008) → MARC Authority detail view
          MarcAuthorities.searchBeats(heading2Updated);
          MarcAuthorities.selectTitle(heading2Updated);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(heading2Updated);
          MarcAuthority.contains('008\\t.{39}$', { regexp: true });

          // Step 12: Open edit → QuickMARC shows 008 boxes
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.GEOSUBD,
            AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN.N,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.SL,
          );

          // Step 13: Reset all 008 dropdowns,
          // update 100 field, save & keep editing → editing window remains open
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.NO,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            '008',
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
            AUTHORITY_008_FIELD_SOURCE_DROPDOWN.NO,
          );
          QuickMarcEditor.updateExistingField('100', `$a ${heading2Updated} edited`);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
        },
      );
    });
  });
});
