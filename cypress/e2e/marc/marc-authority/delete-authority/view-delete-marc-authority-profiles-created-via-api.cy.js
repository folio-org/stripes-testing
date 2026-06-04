import { EXISTING_RECORD_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import JobProfileView from '../../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfileView from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Delete Authority', () => {
      let user;
      let mappingProfileId;
      let actionProfileId;
      let matchProfileId;

      const randomPostfix = getRandomPostfix();
      const profileName = `AT_C436858 Delete MARC authority ${randomPostfix}`;

      const matchProfile = {
        profileName,
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

      const actionProfile = {
        name: profileName,
        action: 'DELETE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };

      before('Create test data and login', () => {
        cy.getAdminToken();

        FieldMappingProfiles.createMappingProfileViaApi(
          FieldMappingProfiles.getDefaultMappingProfile({
            name: profileName,
            isDeleteProfile: true,
          }),
        ).then(({ body }) => {
          mappingProfileId = body.id;

          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfileId).then(
            (actionProfileResponse) => {
              actionProfileId = actionProfileResponse.body.id;

              NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                matchProfile,
              ).then((matchProfileResponse) => {
                matchProfileId = matchProfileResponse.body.id;

                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  profileName,
                  matchProfileId,
                  actionProfileId,
                );
              });
            },
          );
        });

        cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: SettingsMenu.dataImportSettingsPath,
            waiter: SettingsDataImport.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profileName);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(profileName);
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        "C436858 User can view on UI 'Delete MARC authority records' Job, Match, Action, Field mapping profiles created via API (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C436858'] },
        () => {
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.checkListOfExistingProfilesIsDisplayed();
          JobProfiles.search(profileName);
          JobProfileView.verifyJobProfileOpened();

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
          MatchProfiles.search(profileName);
          MatchProfiles.selectMatchProfileFromList(profileName);
          MatchProfileView.verifyMatchProfileOpened();
          MatchProfileView.verifyMatchProfileTitleName(profileName);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.checkListOfExistingProfilesIsDisplayed();
          SettingsActionProfiles.search(profileName);
          SettingsActionProfiles.selectActionProfileFromList(profileName);
          ActionProfileView.verifyActionProfileOpened();
          ActionProfileView.verifyActionProfileTitleName(profileName);
          ActionProfileView.verifyLinkedFieldMappingProfile(profileName);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
          FieldMappingProfiles.search(profileName);
          FieldMappingProfiles.selectMappingProfileFromList(profileName);
          FieldMappingProfileView.waitLoading();
        },
      );
    });
  });
});
