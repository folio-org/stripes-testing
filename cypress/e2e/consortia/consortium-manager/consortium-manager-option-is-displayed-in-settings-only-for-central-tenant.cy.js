import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Capabilities from '../../../support/dictionary/capabilities';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let user;

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.consortiaSettingsSettingsMembershipEdit.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
          UsersSearchPane.searchByUsername(user.username);
          UsersSearchPane.openUser(user.username);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Capabilities.UIConsortiaSettingsMembershipView,
            Capabilities.UIConsortiaSettingsMembershipEdit,
          ]);

          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: SettingsMenu.consortiumManagerPath,
              waiter: ConsortiumManager.waitLoading,
            });
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C386869 "Consortium manager" option is displayed in "Settings" only for Central Tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C386869'] },
      () => {
        ConsortiumManager.verifyConsortiumManagerOnPage();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        ConsortiumManager.verifyConsortiumManagerIsAbsent();
      },
    );
  });
});
