import { Permissions } from '../../../support/dictionary';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        // The list has the default match profiles of the env (at least 3)
        cy.login(userProperties.username, userProperties.password, {
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
      'C423562 Check that checkboxes and checkbox actions for Match profile are suppressed (promin)',
      { tags: ['edgeCases', 'promin', 'C423562'] },
      () => {
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        // Step 1: no checkboxes in the Match profiles list (rows and the "Name" column header)
        MatchProfiles.verifyNoCheckboxesInList();

        // Step 2: "Actions" - only "New match profile", no select / export options
        MatchProfiles.verifyActionsMenuOptions();
      },
    );
  });
});
