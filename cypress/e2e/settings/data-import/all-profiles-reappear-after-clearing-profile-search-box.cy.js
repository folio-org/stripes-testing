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
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
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
    const mappingProfile = {
      name: `402365 autotest mapping profile_${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `402365 autotest action profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const matchProfile = {
      profileName: `402365 autotest match profile_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        in1: '',
        in2: '',
        subfield: '',
      },
      matchCriterion: 'Exactly matches',
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
      existingMatchExpressionValue: 'instance.hrid',
    };
    const jobProfile = {
      name: `402365 autotest job profile_${getRandomPostfix()}`,
    };

    before('create test data', () => {
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
                jobProfile.name,
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
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C402365 Verify that all profiles reappear after clearing the profile search box (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C402365'] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.verifySearchResult(mappingProfile.name);
        FieldMappingProfiles.clearSearchField();
        FieldMappingProfiles.verifySearchFieldIsEmpty();
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.checkListOfExistingProfilesIsDisplayed();
        SettingsActionProfiles.verifySearchFieldIsEmpty();
        SettingsActionProfiles.search(actionProfile.name);
        SettingsActionProfiles.verifySearchResult(actionProfile.name);
        SettingsActionProfiles.clearSearchField();
        SettingsActionProfiles.verifySearchFieldIsEmpty();
        SettingsActionProfiles.checkListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.verifySearchResult(matchProfile.profileName);
        MatchProfiles.clearSearchField();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.search(jobProfile.name);
        JobProfiles.verifySearchResult(jobProfile.name);
        JobProfiles.clearSearchField();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.checkListOfExistingProfilesIsDisplayed();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.verifySearchFieldIsEmpty();
        FileExtensions.search('.dat');
        FileExtensions.verifySearchResult('.dat');
        FileExtensions.clearSearchField();
        FileExtensions.verifySearchFieldIsEmpty();
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
      },
    );
  });
});
