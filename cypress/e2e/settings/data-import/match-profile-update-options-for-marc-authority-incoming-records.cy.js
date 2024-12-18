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
    before('Create test user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411859 Match profile: update options for MARC Authority "Incoming records" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C411859'] },
      () => {
        // #1 Go to "Settings" application-> "Data import" section-> "Match profiles" section-> Click "Actions" button -> Click "New match profile" option
        // "New match profile" page opens
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.clickCreateNewMatchProfile();

        // #2 Click on "MARC Authority" option as the "Existing records" type
        // The "MARC Authority" option appears on the "Existing records" column and highlights
        NewMatchProfile.clickOnExistingRecordByName('MARC Authority');

        // #3 Click on "MARC Authority" option in "Incoming record" column and check the available options
        // * Dropdown list opens and following options appears:
        //  * MARC Authority
        //  * Static value (submatch only)
        // * MARC Bibliographic is NOT present in available options
        NewMatchProfile.verifyIncomingRecordsDropdown(
          'MARC Authority',
          'Static value (submatch only)',
        );
        NewMatchProfile.verifyIncomingRecordsItemDoesNotExist('MARC Bibliographic');
      },
    );
  });
});
