import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Version history', () => {
        const testData = {
          marcAuthorityTabName: 'MARC authority',
          versionHistoryTab: 'Version history',
          sourceFiesTab: 'Manage authority files',
        };

        let testUser;

        before('Create test data', () => {
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then(
            (userProperties) => {
              testUser = userProperties;
            },
          );
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testUser.userId);
        });

        it(
          'C655286 User without permission "Settings (MARC authority): Configure Version history" cannot see "Settings >> MARC authority >> Version history" page (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C655286'] },
          () => {
            cy.login(testUser.username, testUser.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
              authRefresh: true,
            });

            SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
            SettingsPane.checkTabPresentInSecondPane(
              testData.marcAuthorityTabName,
              testData.sourceFiesTab,
              true,
            );
            SettingsPane.checkTabPresentInSecondPane(
              testData.marcAuthorityTabName,
              testData.versionHistoryTab,
              false,
            );
          },
        );
      });
    });
  });
});
