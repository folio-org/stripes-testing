import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const matchProfile = {
      profileName: `match_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '001',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const recordItems = ['INSTANCE', 'HOLDINGS', 'ITEM', 'MARC_BIBLIOGRAPHIC', 'MARC_AUTHORITY'];

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421992 - (NON-CONSORTIA) Verify the match profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.verifyExistingRecordSection(recordItems);
        NewMatchProfile.close();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileTitleName(matchProfile.profileName);

        recordItems.forEach((item) => {
          MatchProfileView.verifyExistingDetails(item);
        });
      },
    );
  });
});
