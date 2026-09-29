import { ACTION_NAMES_IN_ACTION_PROFILE, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
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
    });

    it(
      'C449374 Confirm user cannot set Create action for MARC Bib record type (promin)',
      { tags: ['extendedPath', 'promin', 'C449374'] },
      () => {
        // Step 1: Actions > New action profile
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        // Step 2: "Action*" dropdown shows the full "Create" option text
        NewActionProfile.verifyActionOptions([ACTION_NAMES_IN_ACTION_PROFILE.CREATE]);

        // Step 3: select the "Create" option
        NewActionProfile.chooseAction(ACTION_NAMES_IN_ACTION_PROFILE.CREATE);
        NewActionProfile.verifyActionOptionSelected(ACTION_NAMES_IN_ACTION_PROFILE.CREATE);

        // Step 4: "FOLIO record type*" dropdown does not offer "MARC Bibliographic"
        NewActionProfile.verifyFolioRecordTypeOptionsDoesNotContainText(
          FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        );

        NewActionProfile.closeProfileWithoutSaving();
      },
    );
  });
});
