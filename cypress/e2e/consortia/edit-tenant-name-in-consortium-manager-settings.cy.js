import Permissions from '../../support/dictionary/permissions';
import Affiliations, {
  tenantNames,
  tenantCodes,
  tenantErrors,
} from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
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
    'C380515 Edit address (tenant) name in "Consortium manager" settings (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet'] },
    () => {
      ConsortiumManager.selectMembership();
      ConsortiumManager.getIndexForTenantRow(tenantNames.professional).then((rowIndex) => {
        ConsortiumManager.editTenant(tenantNames.professional);
        ConsortiumManager.editTenantInformation(
          rowIndex,
          `${tenantCodes.professional}E`,
          `${tenantNames.professional}-Edited`,
        );
        ConsortiumManager.saveEditingTenantInformation(rowIndex);
        ConsortiumManager.checkEditedTenantInformation(
          rowIndex,
          `${tenantCodes.professional}E`,
          `${tenantNames.professional}-Edited`,
        );
        ConsortiumManager.editTenant(`${tenantNames.professional}-Edited`);
        ConsortiumManager.editTenantInformation(
          rowIndex,
          tenantCodes.professional,
          tenantNames.professional,
        );
        ConsortiumManager.saveEditingTenantInformation(rowIndex);
        ConsortiumManager.checkEditedTenantInformation(
          rowIndex,
          tenantCodes.professional,
          tenantNames.professional,
        );
        ConsortiumManager.editTenant(tenantNames.professional);
        ConsortiumManager.editTenantInformation(
          rowIndex,
          `${tenantCodes.professional}-E`,
          character151,
        );
        ConsortiumManager.checkErrorsInEditedTenantInformation(
          rowIndex,
          tenantErrors.code,
          tenantErrors.name,
        );
        ConsortiumManager.cancelEditingTenantInformation(rowIndex);
      });
    },
  );
});
