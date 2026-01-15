import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  let user;

  before(() => {
    cy.getAdminToken();
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C388499 "Switch active affiliation" option is NOT displayed when a user has only one assigned affiliation (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet', 'C388499'] },
    () => {
      cy.createTempUser([
        Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
        Permissions.uiUserCanAssignUnassignPermissions.gui,
        Permissions.uiUserEdit.gui,
        Permissions.uiUsersPermissionsView.gui,
        Permissions.uiUsersView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
          });
          cy.wait(8000);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliationIsAbsent();
        })
        .then(() => {
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
        });
      cy.reload();
      ConsortiumManager.switchActiveAffiliationExists();
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
