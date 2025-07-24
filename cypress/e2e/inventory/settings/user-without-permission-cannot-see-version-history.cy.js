import Permissions from '../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Version history', () => {
      const versionHistoryTab = 'Version history';
      const classificationTypesTab = 'Classification identifier types';
      let testUser;

      before('Create user', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsInventoryViewList.gui]).then((userProperties) => {
          testUser = userProperties;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
      });

      it(
        'C655273 User without permission "Settings (Inventory): Can view and edit general settings" cannot see "Settings >> Inventory >> Version history" page (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C655273'] },
        () => {
          cy.login(testUser.username, testUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          SettingsPane.checkTabPresentInSecondPane(
            APPLICATION_NAMES.INVENTORY,
            classificationTypesTab,
            true,
          );
          SettingsPane.checkTabPresentInSecondPane(
            APPLICATION_NAMES.INVENTORY,
            versionHistoryTab,
            false,
          );
        },
      );
    });
  });
});
