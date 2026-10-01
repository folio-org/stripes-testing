import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ACTION_NAMES_IN_ACTION_PROFILE,
  ACCEPTED_DATA_TYPE_NAMES,
  DEFAULT_ACTION_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfileEditForm from '../../../support/fragments/settings/dataImport/jobProfiles/jobProfileEditForm';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/jobProfiles/jobProfiles';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SelectProfileModal from '../../../support/fragments/settings/dataImport/modals/selectProfileModal';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    // A varied mix of leading characters (digit, spread-out letters, mixed case), already in
    // correct case-insensitive ascending order by construction - meets the "at least 3"
    // precondition while still exercising digit-vs-letter and case-insensitive ordering.
    // The last one of each type is created via the UI in the test itself.
    const firstChars = ['3', 'B', 'K', 'm', 'y'];
    const buildProfileNames = (entityType) => firstChars.map((char) => `${char}_C378099_${entityType}_${randomPostfix}`);
    const actionProfileNames = buildProfileNames('Action');
    const matchProfileNames = buildProfileNames('Match');
    const jobProfileNames = buildProfileNames('Job');

    const apiActionProfileNames = actionProfileNames.slice(0, -1);
    const uiActionProfileName = actionProfileNames[actionProfileNames.length - 1];
    const apiMatchProfileNames = matchProfileNames.slice(0, -1);
    const uiMatchProfileName = matchProfileNames[matchProfileNames.length - 1];
    const apiJobProfileNames = jobProfileNames.slice(0, -1);
    const uiJobProfileName = jobProfileNames[jobProfileNames.length - 1];

    before('Create profiles and user', () => {
      cy.getAdminToken();

      apiActionProfileNames.forEach((name) => {
        ActionProfiles.createActionProfileViaApi({
          profile: { name, action: 'CREATE', folioRecord: EXISTING_RECORD_NAMES.INSTANCE },
          addedRelations: [],
          deletedRelations: [],
        });
      });

      apiMatchProfileNames.forEach((name) => {
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
          profileName: name,
          incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
          existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        });
      });

      // Job profiles must have at least one associated action profile - link them all to the
      // existing default one instead of creating a dedicated action profile per job profile
      ActionProfiles.getActionProfilesViaApi({
        query: `name="${DEFAULT_ACTION_PROFILE_NAMES.CREATE_INSTANCE}"`,
      }).then(({ actionProfiles }) => {
        apiJobProfileNames.forEach((name) => {
          NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(name, actionProfiles[0].id);
        });
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      actionProfileNames.forEach((name) => ActionProfiles.deleteActionProfileByNameViaApi(name));
      matchProfileNames.forEach((name) => MatchProfiles.deleteMatchProfileByNameViaApi(name));
      jobProfileNames.forEach((name) => SettingsJobProfiles.deleteJobProfileByNameViaApi(name));
    });

    it(
      'C378099 Verify Job and match profiles alphabetical order (promin)',
      { tags: ['extendedPath', 'promin', 'C378099'] },
      () => {
        // Step 1: Settings > Data import > Action profiles - list is displayed
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();

        // Steps 2-3: Actions > New action profile > fill Name/Action/FOLIO record type > Save & Close
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();
        NewActionProfile.fill({
          name: uiActionProfileName,
          action: ACTION_NAMES_IN_ACTION_PROFILE.CREATE,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        });
        NewActionProfile.saveProfile();
        ActionProfiles.verifyActionProfileOpened();

        // Step 4: Close the detail view - list is displayed, sorted alphabetically
        ActionProfiles.close(uiActionProfileName);
        ActionProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 5: Match profiles list
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        // Steps 6-7: Actions > New match profile > fill Name/MARC Bibliographic/Instance/001/
        // Admin data: Instance HRID > Save & Close
        MatchProfiles.createMatchProfile({
          profileName: uiMatchProfileName,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          incomingRecordFields: {
            field: '001',
            in1: '',
            in2: '',
            subfield: '',
          },
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        });

        // Step 8: Close the detail view - list is displayed, sorted alphabetically
        MatchProfileView.closeViewMode();
        MatchProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 9: Job profiles list
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        SettingsJobProfiles.waitLoading();

        // Step 10: Actions > New job profile
        SettingsJobProfiles.createNewJobProfile();
        cy.wait(3000);

        // Steps 11-12: "+" icon > Match - "Select Match Profiles" pop-up sorted alphabetically, then close
        JobProfileEditForm.clickAddProfileButton('Match');
        SelectProfileModal.waitLoading();
        SelectProfileModal.verifyProfilesIsSortedInAlphabeticalOrder();
        SelectProfileModal.close();

        // Steps 13-14: "+" icon > Action - "Select Action Profiles" pop-up sorted alphabetically, then close
        JobProfileEditForm.clickAddProfileButton('Action');
        SelectProfileModal.waitLoading();
        SelectProfileModal.verifyProfilesIsSortedInAlphabeticalOrder();
        SelectProfileModal.close();

        // Step 15: fill Name/Accepted data type, link a valid Create action profile, Save & Close
        JobProfileEditForm.fillJobProfileFields({
          summary: { name: uiJobProfileName, dataType: ACCEPTED_DATA_TYPE_NAMES.MARC },
          overview: { action: 'Action', name: DEFAULT_ACTION_PROFILE_NAMES.CREATE_INSTANCE },
        });
        JobProfileEditForm.clickSaveAndCloseButton();
        SettingsJobProfiles.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
