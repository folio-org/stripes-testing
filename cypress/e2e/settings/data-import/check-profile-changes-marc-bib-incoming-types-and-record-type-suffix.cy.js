import { EXISTING_RECORD_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const willAffectSuffix = 'will affect SRS and MARCcat';
    const edifactRecordType = 'EDIFACT';

    before('Login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.matchProfilePath,
          waiter: MatchProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343285 Check that a few changes were made to various profiles (promin)',
      { tags: ['extendedPath', 'promin', 'C343285'] },
      () => {
        // Steps 1-2: Match profiles list is displayed > Actions > New
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();

        // Step 3: select MARC Bibliographic existing record type
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC);

        // Step 4: EDIFACT is not present in the incoming record types list
        NewMatchProfile.verifyIncomingRecordsDropdown(FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC);
        NewMatchProfile.verifyIncomingRecordsItemDoesNotExist(edifactRecordType);

        // Step 5: cancel the match profile; go to Action profiles
        NewMatchProfile.closeWithoutSaving();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();

        // Step 6: Actions > New action profile
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyFOLIORecordTypeOptionExists(FOLIO_RECORD_TYPE.MARCAUTHORITY);

        // Step 7: none of the FOLIO record types show the "will affect SRS and MARCcat" suffix
        NewActionProfile.verifyFolioRecordTypeOptionsDoesNotContainText(willAffectSuffix);
      },
    );
  });
});
