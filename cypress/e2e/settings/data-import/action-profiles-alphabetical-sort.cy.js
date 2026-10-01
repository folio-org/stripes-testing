import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ACTION_NAMES_IN_ACTION_PROFILE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
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
    // correct case-insensitive ascending order by construction - meets the "at least 5"
    // precondition while still exercising digit-vs-letter and case-insensitive ordering.
    // The last one is created via the UI in the test itself (TestRail steps 2-3).
    const firstChars = ['3', 'B', 'K', 'm', 'y'];
    const actionProfileNames = firstChars.map((char) => `${char}_C377047_${randomPostfix}`);
    const apiActionProfileNames = actionProfileNames.slice(0, -1);
    const uiActionProfileName = actionProfileNames[actionProfileNames.length - 1];

    before('Create action profiles and user', () => {
      cy.getAdminToken();

      apiActionProfileNames.forEach((name) => {
        ActionProfiles.createActionProfileViaApi({
          profile: { name, action: 'CREATE', folioRecord: EXISTING_RECORD_NAMES.INSTANCE },
          addedRelations: [],
          deletedRelations: [],
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
      actionProfileNames.forEach((name) => {
        ActionProfiles.deleteActionProfileByNameViaApi(name);
      });
    });

    it(
      'C377047 Verify Action profiles alphabetical sort (promin)',
      { tags: ['extendedPath', 'promin', 'C377047'] },
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

        // Step 4: Close the detail view - back to the list
        ActionProfiles.close(uiActionProfileName);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();

        // Step 5: Refresh the page - the whole list is sorted alphabetically
        cy.reload();
        ActionProfiles.waitLoading();
        ActionProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // Steps 6-7: Field mapping profiles > New field mapping profile > Link profile - "Select
        // Action Profiles" pop-up shows action profiles sorted alphabetically
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.clickLinkProfileButton();
        SelectProfileModal.waitLoading();
        SelectProfileModal.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
