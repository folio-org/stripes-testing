import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  EXISTING_RECORDS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `402365 autotest mapping profile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `402365 autotest action profile_${getRandomPostfix()}`,
    };
    const matchProfile = {
      profileName: `402365 autotest match profile_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `402365 autotest job profile_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create field mapping profile
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.save();
      // create Action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      // create Job profiles
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.saveAndClose();
      cy.logout();

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C402365 Verify that all profiles reappear after clearing the profile search box (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.verifySearchResult(mappingProfile.name);
        FieldMappingProfiles.clearSearchField();
        FieldMappingProfiles.verifySearchFieldIsEmpty();
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.verifySearchFieldIsEmpty();
        ActionProfiles.search(actionProfile.name);
        ActionProfiles.verifySearchResult(actionProfile.name);
        ActionProfiles.clearSearchField();
        ActionProfiles.verifySearchFieldIsEmpty();
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.verifySearchResult(matchProfile.profileName);
        MatchProfiles.clearSearchField();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.verifySearchResult(jobProfile.profileName);
        JobProfiles.clearSearchField();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.checkListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.fileExtensionsPath);
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
