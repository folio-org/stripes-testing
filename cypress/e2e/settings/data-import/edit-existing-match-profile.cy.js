import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
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

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2339 autotest MatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        in1: '',
        in2: '',
        subfield: '',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.hrid',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(matchProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      });
    });

    it(
      'C2339 Edit an existing match profile (folijet)',
      { tags: ['criticalPath', 'folijet', 'C2339'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);
        MatchProfileView.edit();
        MatchProfileEdit.verifyScreenName(matchProfile.profileName);
        MatchProfileEdit.changeExistingInstanceRecordField();
        MatchProfileEdit.clickSaveAndCloseButton({
          profileCreated: false,
          profileUpdated: true,
        });
        MatchProfileView.verifyExistingInstanceRecordField();
      },
    );
  });
});
