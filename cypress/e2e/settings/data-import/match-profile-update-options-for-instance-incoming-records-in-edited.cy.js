import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const matchProfile = {
      profileName: `C411691 Match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411691 Match profile: update options for Instance "Incoming records" in Edited Match Profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C411691'] },
      () => {
        // Go to "Settings" application-> "Data import" section-> "Match profiles" section
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);

        // Click a match profile from the list
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);

        // Click on the "Actions" button-> Click on the "Edit" button
        MatchProfileView.edit();

        // Click on "Instance" option as the "Existing records" type
        MatchProfileEdit.clickOnExistingRecordByName('Instance');

        // Click on "MARC Bibliographic" option in "Incoming record" column and check the available options
        MatchProfileEdit.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        MatchProfileEdit.verifyIncomingRecordsItemDoesNotExist('MARC Authority');
      },
    );
  });
});
