import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411692 Match profile: Ensure MARC Authority is NOT present in available options for Incoming Record for New Match Profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C411692'] },
      () => {
        // #1 Go to "Settings" application-> "Data import" section-> "Match profiles" section-> Click "Actions" button -> Click "New match profile" option
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.clickCreateNewMatchProfile();

        // #2 Click on "Instance" in "Details" accordion
        NewMatchProfile.clickOnExistingRecordByName('Instance');

        // #3 Click on "MARC Bibliographic" option in "Incoming record" column and check the available options
        NewMatchProfile.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        NewMatchProfile.verifyIncomingRecordsItemDoesNotExist('MARC Authority');
      },
    );
  });
});
