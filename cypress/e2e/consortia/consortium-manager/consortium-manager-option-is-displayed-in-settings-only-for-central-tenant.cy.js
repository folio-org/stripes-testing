import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Consortia -> Consortium manager', () => {
  let user;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.consortiaSettingsSettingsMembershipEdit.gui])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.consortiaSettingsSettingsMembershipEdit.gui,
          Permissions.consortiaSettingsSettingsMembershipView.gui,
        ]);
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
    'C386869: "Consortium manager" option is displayed in "Settings" only for Central Tenant (consortia)(thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      ConsortiumManager.varifyConsortiumManagerOnPage();
      ConsortiumManager.switchActiveAffiliationExists();
      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      ConsortiumManager.varifyConsortiumManagerIsAbsent();
    },
  );
});
