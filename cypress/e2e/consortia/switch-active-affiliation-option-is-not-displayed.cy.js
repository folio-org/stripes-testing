import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';

const R = {
  USER: 'user',
};

const initialNavigationOptions = {
  path: TopMenu.usersPath,
  waiter: Users.waitLoading,
};

const assignUserToAffiliationByAdmin = (flow) => {
  cy.logout();
  cy.resetTenant();
  cy.getAdminToken();
  cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId);
  cy.login(flow.get(R.USER).username, flow.get(R.USER).password, initialNavigationOptions);
};

describe('Consortia', () => {
  const flow = new ExecutionFlowManager();

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
      Permissions.uiUserCanAssignUnassignPermissions.gui,
      Permissions.uiUserEdit.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      flow.set(R.USER, userProperties, (user) => Users.deleteViaApi(user.userId));
      cy.login(userProperties.username, userProperties.password, initialNavigationOptions);
    });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C388499 "Switch active affiliation" option is NOT displayed when a user has only one assigned affiliation (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet', 'C388499'] },
    () => {
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      ConsortiumManager.switchActiveAffiliationIsAbsent();

      assignUserToAffiliationByAdmin(flow);

      ConsortiumManager.switchActiveAffiliationExists();
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
