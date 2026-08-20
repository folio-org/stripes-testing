import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C377024 Verify that no 404 error in console appears after navigating to the match profiles main page in settings (promin)',
      { tags: ['extendedPath', 'promin', 'C377024'] },
      () => {
        // Step 1: Set up network spy BEFORE navigation to catch any matching request during page load
        let noteSchemaRequested = false;
        cy.intercept('GET', /jsonSchemas.*note\.json/, () => {
          noteSchemaRequested = true;
        }).as('noteSchemaWatch');

        // Step 2: Navigate to Settings > Data Import > Match profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        SettingsMatchProfiles.waitLoading();
        cy.wait(3000); // make sure all API calls are completed

        // Step 3: Verify "jsonSchemas?path=types/notes/note.json" request was NOT made
        cy.wrap(null).then(() => {
          expect(
            noteSchemaRequested,
            'jsonSchemas?path=types/notes/note.json should not be requested',
          ).to.eq(false);
        });
      },
    );
  });
});
