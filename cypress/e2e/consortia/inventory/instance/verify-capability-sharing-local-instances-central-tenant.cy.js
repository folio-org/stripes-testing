import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

const testData = {
  roleName: `AT_C404509_UserRole_${getRandomPostfix()}`,
  appName: 'app-consortia-manager',
  capability: Capabilities.uiConsortiaSettingsConsortiumManagerShare,
  capabilitySet: CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
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
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user?.userId);
      });

      it(
        'C404509 (CONSORTIA) Verify the capability for sharing local instances on Central tenant (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C404509'] },
        () => {
          // Step 1-2: Navigate to Settings → Authorization roles (done via login path)
          AuthorizationRoles.waitContentLoading();

          // Step 3: Create new role, select app-consortia-manager, save modal
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.checkSaveButton();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.appName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.waitCapabilitiesShown();

          // Step 4: Verify "UI-Consortia-Settings Consortium-Manager Share" capability and set are present
          AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(testData.capability);
          AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(testData.capabilitySet);
        },
      );
    });
  });
});
