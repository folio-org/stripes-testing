import Permissions from '../../support/dictionary/permissions';
import Affiliations, {
  tenantNames,
  tenantCodes,
  tenantErrors,
} from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Users -> Consortia', () => {
  const character151 =
    'Beyond the horizon, a world of possibilities awaits. Embrace the journey, learn from challenges, and celebrate every small victory along the way.1234567';
  let user;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.consortiaSettingsSettingsMembershipEdit.gui])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        cy.setTenant(Affiliations.Consortia);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.consortiaSettingsSettingsMembershipEdit.gui,
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
    'C380515: Edit address (tenant) name in "Consortium manager" settings (consortia)(thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      ConsortiumManager.selectMembership();
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(
        2,
        `${tenantCodes.professional}E`,
        `${tenantNames.professional}-Edited`,
      );
      ConsortiumManager.saveEditingTenantInformation(2);
      ConsortiumManager.checkEditedTenantInformation(
        2,
        `${tenantCodes.professional}E`,
        `${tenantNames.professional}-Edited`,
      );
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(
        2,
        tenantCodes.professional,
        tenantNames.professional,
      );
      ConsortiumManager.saveEditingTenantInformation(2);
      ConsortiumManager.checkEditedTenantInformation(
        2,
        tenantCodes.professional,
        tenantNames.professional,
      );
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(2, `${tenantCodes.professional}-E`, character151);
      ConsortiumManager.checkErrorsInEditedTenantInformation(
        2,
        tenantErrors.code,
        tenantErrors.name,
      );
      ConsortiumManager.cancelEditingTenantInformation(2);
    },
  );
});
