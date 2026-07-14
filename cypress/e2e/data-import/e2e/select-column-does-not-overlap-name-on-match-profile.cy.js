import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { MatchProfiles, SettingsDataImport } from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;
    const matchProfileName = 'Inventory Single Record - Default match for existing SRS record';

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C466234 Check that "select" is not overlaps "Name" field on Match profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C466234'] },
      () => {
        // Step 1: Open default match profile
        MatchProfiles.search(matchProfileName);
        MatchProfiles.selectMatchProfileFromList(matchProfileName);
        MatchProfileView.verifyMatchProfileOpened();

        // Step 2: Verify that "Select" column is not overlaps "Name" column in associated job profiles list
        MatchProfileView.verifyAssociatedJobProfileShownColumns([
          'Name',
          'Tags',
          'Updated',
          'Updated by',
        ]);
        MatchProfileView.verifyAssociatedJobProfileHiddenColumns(['Select']);
      },
    );
  });
});
