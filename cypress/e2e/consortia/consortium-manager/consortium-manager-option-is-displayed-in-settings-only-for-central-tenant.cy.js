import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import TopMenu from '../../../support/fragments/topMenu';

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
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C386869 "Consortium manager" option is displayed in "Settings" only for Central Tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C386869'] },
      () => {
        ConsortiumManager.verifyConsortiumManagerOnPage();
        ConsortiumManager.switchActiveAffiliationExists();
        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        ConsortiumManager.verifyConsortiumManagerIsAbsent();
      },
    );
  });
});
