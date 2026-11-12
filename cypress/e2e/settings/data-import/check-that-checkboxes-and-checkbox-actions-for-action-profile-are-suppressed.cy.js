import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        // The list has the default action profiles of the env (at least 3)
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423387 Check that checkboxes and checkbox actions for Action profile are suppressed (promin)',
      { tags: ['edgeCases', 'promin', 'C423387'] },
      () => {
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        // Step 1: no checkboxes in the Action profiles list (rows and the "Name" column header)
        ActionProfiles.verifyNoCheckboxesInList();

        // Step 2: "Actions" - only "New action profile", no select / export options
        ActionProfiles.verifyActionsMenuOptions();
      },
    );
  });
});
