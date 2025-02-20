import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowse } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      describe('Consortia', () => {
        let user;

        const permissions = [Permissions.uiSettingsCallNumberBrowseView.gui];

        before('Create user, login', () => {
          cy.getAdminToken();
          cy.createTempUser(permissions).then((userProperties) => {
            user = userProperties;
            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions,
            });

            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            CallNumberBrowse.openCallNumberBrowse();
            CallNumberBrowse.validateCallNumberBrowsePaneOpened();
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C627461 Edit "Call number browse" option from Central/Member tenants (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C627461'] },
          () => {
            CallNumberBrowse.clickEditButtonForItem('Call numbers (all)');
            CallNumberBrowse.validateSaveButtonIsDisabledForItem('Call numbers (all)');
          },
        );
      });
    });
  });
});
