import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        // The list has the default field mapping profiles of the env (at least 3)
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423388 Check that checkboxes and checkbox actions for Field mapping profile are suppressed (promin)',
      { tags: ['edgeCases', 'promin', 'C423388'] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        // Step 1: no checkboxes in the Field mapping profiles list (rows and the "Name" column header)
        FieldMappingProfiles.verifyNoCheckboxesInList();

        // Step 2: "Actions" - only "New field mapping profile", no select / export options
        FieldMappingProfiles.verifyActionsMenuOptions();
      },
    );
  });
});
