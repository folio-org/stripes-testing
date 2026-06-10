import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSettingsInventoryViewList.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    // bug report https://folio-org.atlassian.net/browse/STRIPES-1024
    it(
      'C350397 Change focus for Inventory settings (folijet)',
      { tags: ['extendedPath', 'folijet', 'C350397'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.checkAppSettingsNavPaneFocused();
        SettingsInventory.goToSettingsInventory();
        SettingsPane.checkAppSettingsNavPaneFocused();
      },
    );
  });
});
