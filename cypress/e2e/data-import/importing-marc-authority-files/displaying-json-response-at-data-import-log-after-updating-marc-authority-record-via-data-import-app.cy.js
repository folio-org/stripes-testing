import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(15);

    const authorityHeading = `AT_C434143_MarcAuthority_${randomPostfix}`;
    const relatedHeading = `AT_C434143_Related_${randomPostfix}`;
    const updatedRelatedHeading = `AT_C434143_RelatedUpdated_${randomPostfix}`;
    const naturalId = `${randomDigits}434143`;
    const tag010SubfieldA = `${randomDigits}0434143`;
    const noRecordMessage = 'No record';

    const exportedMarcFileName = `AT_C434143_exported_${randomPostfix}.mrc`;
    const editedMarcFileName = `AT_C434143_edited_${randomPostfix}.mrc`;

    const mappingProfile = {
      name: `AT_C434143 Update MARC authority records by matching 010 $a ${randomPostfix}`,
    };
    const actionProfile = {
      name: `AT_C434143 Update MARC authority records by matching 010 $a ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C434143 Update MARC authority records by matching 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C434143 Update MARC authority records by matching 010 $a ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcAuthFields = [
      { tag: '010', content: `$a ${tag010SubfieldA}`, indicators: ['\\', '\\'] },
      { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
      // non-heading reference field — this will be edited in the exported file
      { tag: '400', content: `$a ${relatedHeading}`, indicators: ['1', '\\'] },
    ];

    let user;
    let authorityId;

    before('Create test data, export, edit, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C434143_');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });

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

      MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
        authorityId = id;
        // export the created authority directly via API (no UI export needed)
        cy.downloadDataExportRecordViaApi(id, 'AUTHORITY').then((body) => {
          FileManager.createFile(`cypress/fixtures/${exportedMarcFileName}`, body);
          // Step 6: edit 400 $a (non-heading field) — leaves 100 heading unchanged
          DataImport.editMarcFile(
            exportedMarcFileName,
            editedMarcFileName,
            [relatedHeading],
            [updatedRelatedHeading],
          );
        });
      });

      cy.then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user?.userId);
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C434143 Displaying json response at data import log after updating MARC Authority record via Data import app (promin)',
      { tags: ['extendedPath', 'promin', 'C434143'] },
      () => {
        // Steps 1-4: Upload edited file, select job profile, run, wait for completion
        DataImport.uploadFile(editedMarcFileName, editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        // Step 5: Open log details; verify SRS MARC and Authority both show "Updated"
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.authority,
        );

        // Step 6: Click title of updated record → JSON screen opens with "Incoming record" tab by default
        FileDetails.openJsonScreen(authorityHeading);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(authorityHeading);
        JsonScreenView.verifyContentInTab(authorityId);
        JsonScreenView.verifyContentInTab(naturalId);

        // Step 7: "Authority" tab shows Authority JSON, not "No record" message
        JsonScreenView.openAuthorityTab();
        JsonScreenView.verifyContentInTab(authorityHeading);
        JsonScreenView.verifyContentInTab(authorityId);
        JsonScreenView.verifyContentInTab(naturalId);
        JsonScreenView.verifyContentNotExistInTab(noRecordMessage);

        // Step 8: "SRS MARC" tab shows MARC authority JSON, not "No record" message
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab(authorityHeading);
        JsonScreenView.verifyContentInTab(authorityId);
        JsonScreenView.verifyContentInTab(naturalId);
        JsonScreenView.verifyContentNotExistInTab(noRecordMessage);

        // Steps 9-11: Navigate to MARC Authority app, search updated record, open detail view
        cy.visit(TopMenu.marcAuthorities);
        MarcAuthorities.waitLoading();
        MarcAuthorities.searchBeats(authorityHeading);
        MarcAuthorities.selectTitle(authorityHeading);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(authorityId);

        // Steps 12-13: Open edit view; verify Source shows the test user's name
        MarcAuthority.edit();
        QuickMarcEditor.checkContentByTag('400', `$a ${updatedRelatedHeading}`);
        QuickMarcEditor.checkSourceValue(user.firstName, user.lastName);
      },
    );
  });
});
