import { APPLICATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings (General)', () => {
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
      'C350406 Change focus for Settings (folijet)',
      { tags: ['extendedPath', 'folijet', 'C350406'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.checkAppSettingsNavPaneFocused();
      },
    );
  });
});
