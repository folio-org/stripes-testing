import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = { name: `C402332 autotest mapping profile_${getRandomPostfix()}` };
    const actionProfile = {
      name: `C402332 autotest action profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const matchProfile = {
      profileName: `C402332 autotest match profile_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        in1: '',
        in2: '',
        subfield: '',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.hrid',
    };
    const jobProfileName = `C402332 autotest job profile ${getRandomPostfix()}`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
              matchProfile,
            ).then((matchProfileResponse) => {
              NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfileName,
                matchProfileResponse.body.id,
                actionProfileResponse.body.id,
              );
            });
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C402332 Verify that any existing profile search is cleared when switching to a different profile type (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C402332'] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.verifySearchResult(mappingProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.checkListOfExistingProfilesIsDisplayed();
        SettingsActionProfiles.verifySearchFieldIsEmpty();
        SettingsActionProfiles.search(actionProfile.name);
        SettingsActionProfiles.verifySearchResult(actionProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.verifySearchResult(matchProfile.profileName);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.search(jobProfileName);
        JobProfiles.verifySearchResult(jobProfileName);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.verifySearchFieldIsEmpty();
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.verifySearchFieldIsEmpty();
        SettingsActionProfiles.checkListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
      },
    );
  });
});
