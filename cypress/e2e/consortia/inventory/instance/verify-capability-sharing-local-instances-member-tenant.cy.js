import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const testData = {
  roleName: `AT_C404510_UserRole_${getRandomPostfix()}`,
  appName: 'app-consortia',
  capability: Capabilities.consortiaInventoryLocalSharingInstances,
  capabilitySet: CapabilitySets.consortiaInventoryLocalSharingInstances,
};

const capabSetsToAssign = [
  CapabilitySets.uiAuthorizationRolesSettingsAdmin,
  CapabilitySets.capabilities,
  CapabilitySets.roleCapabilitySets,
];

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      before('Create user', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        });
      });

      after('Delete user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user?.userId);
      });

      it(
        'C404510 (CONSORTIA) Verify the capability for sharing local instances on Member tenant (promin)',
        { tags: ['extendedPathECS', 'promin', 'C404510'] },
        () => {
          // Step 1-2: Navigate to Settings → Authorization roles (done via login path)
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          // Step 3: Create new role, select app-consortia-manager, save modal
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.checkSaveButton();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.appName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.waitCapabilitiesShown();

          // Step 4: Verify expected capability and set are present
          AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(testData.capability);
          AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(testData.capabilitySet);
        },
      );
    });
  });
});
