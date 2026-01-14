import Affiliations, {
  tenantCodes,
  tenantErrors,
  tenantNames,
} from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';

describe('Consortia', () => {
  const character151 =
    'Beyond the horizon, a world of possibilities awaits. Embrace the journey, learn from challenges, and celebrate every small victory along the way.1234567';
  let user;

  before('Create users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    cy.createTempUser([Permissions.consortiaSettingsSettingsMembershipEdit.gui])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
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
    { tags: ['smokeECS', 'thunderjet', 'C380515'] },
    () => {
      ConsortiumManager.selectMembership();
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(
        `${tenantCodes.professional}E`,
        `${tenantNames.professional}-Edited`,
      );
      ConsortiumManager.saveEditingTenantInformation();
      ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
        `${tenantCodes.professional}E`,
        `${tenantNames.professional}-Edited`,
        Affiliations.Professional,
      ]);
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(tenantCodes.professional, tenantNames.professional);
      ConsortiumManager.saveEditingTenantInformation();
      ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
        tenantCodes.professional,
        tenantNames.professional,
        Affiliations.Professional,
      ]);
      ConsortiumManager.editTenant(tenantNames.professional);
      ConsortiumManager.editTenantInformation(`${tenantCodes.professional}-ED`, character151);
      ConsortiumManager.checkErrorsInEditedTenantInformation(tenantErrors.code, tenantErrors.name);

      ConsortiumManager.cancelEditingTenantInformation();
    },
  );
});
