import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

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
          UserEdit.assignAllPermissionsToTenant(tenantNames.college, 'Settings');
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.consortiaSettingsSettingsMembershipEdit.gui,
            Permissions.consortiaSettingsSettingsMembershipView.gui,
          ]);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: SettingsMenu.consortiumManagerPath,
            waiter: ConsortiumManager.waitLoading,
          });
        });
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C386869 "Consortium manager" option is displayed in "Settings" only for Central Tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet'] },
      () => {
        ConsortiumManager.varifyConsortiumManagerOnPage();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        ConsortiumManager.varifyConsortiumManagerIsAbsent();
      },
    );
  });
});
