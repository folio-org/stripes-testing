import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CompareRoles from '../../../../support/fragments/consortium-manager/authorization-roles/compareRoles';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleNameCentral: `AT_C552458_TestRole_Central_${randomPostfix}`,
      roleNameMember: `AT_C552458_TestRole_Member_${randomPostfix}`,
      roleNameUserAExtra: `AT_C552458_UserAExtra_Central_${randomPostfix}`,
      capabilitiesForRoleCentral: [
        {
          table: CAPABILITY_TYPES.PROCEDURAL,
          resource: 'UI-Finance Acq Unit Assignment',
          action: CAPABILITY_ACTIONS.EXECUTE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Allocations',
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Transfers',
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Acq Unit Assignment',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Fiscal-Year',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      capabilitiesForRoleMember: [
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Allocations',
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Transfers',
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Acq Unit Assignment',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Fiscal-Year',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      capabilitiesForUserAExtra: [
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'Capabilities',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
      ],
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMember = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let tempUser;
    let userA;
    let userB;
    let roleCentralId;
    let roleMemberId;
    let roleUserAExtraId;
    const capabIdsCentral = [];
    const capabIdsMember = [];
    const capabIdsUserAExtra = [];

    before('Create users and test data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          tempUser = userProperties;
          cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignCentral);
        });
        cy.createTempUser([]).then((userAProperties) => {
          userA = userAProperties;
        });
        cy.createTempUser([]).then((userBProperties) => {
          userB = userBProperties;
        });
      }).then(() => {
        // Assign affiliations
        cy.assignAffiliationToUser(Affiliations.College, tempUser.userId);
        cy.assignAffiliationToUser(Affiliations.College, userA.userId);
        cy.assignAffiliationToUser(Affiliations.College, userB.userId);

        // Create authorization roles
        cy.createAuthorizationRoleApi(testData.roleNameCentral).then((role) => {
          roleCentralId = role.id;
        });
        cy.createAuthorizationRoleApi(testData.roleNameUserAExtra).then((role) => {
          roleUserAExtraId = role.id;
        });

        // Get capability IDs for Central tenant
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          capability.type = capability.table;
          cy.getCapabilityIdViaApi(capability).then((capabId) => {
            capabIdsCentral.push(capabId);
          });
        });
        testData.capabilitiesForUserAExtra.forEach((capability) => {
          capability.type = capability.table;
          cy.getCapabilityIdViaApi(capability).then((capabId) => {
            capabIdsUserAExtra.push(capabId);
          });
        });

        // Switch to Member tenant and create role
        cy.setTenant(Affiliations.College);
        cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignMember);
        cy.createAuthorizationRoleApi(testData.roleNameMember).then((role) => {
          roleMemberId = role.id;
        });

        // Get capability IDs for Member tenant
        testData.capabilitiesForRoleMember.forEach((capability) => {
          capability.type = capability.table;
          cy.getCapabilityIdViaApi(capability).then((capabId) => {
            capabIdsMember.push(capabId);
          });
        });
      });
    });

    before('Assign capabilities and roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.then(() => {
        // Assign capabilities to Central roles
        cy.addCapabilitiesToNewRoleApi(roleCentralId, capabIdsCentral);
        cy.addCapabilitiesToNewRoleApi(roleUserAExtraId, capabIdsUserAExtra);

        // Assign capabilities to Member role
        cy.setTenant(Affiliations.College);
        cy.addCapabilitiesToNewRoleApi(roleMemberId, capabIdsMember);
      }).then(() => {
        // Assign roles to users
        cy.resetTenant();
        // User A gets Test role in both tenants plus extra role in Central
        cy.addRolesToNewUserApi(userA.userId, [roleCentralId, roleUserAExtraId]);
        cy.setTenant(Affiliations.College);
        cy.addRolesToNewUserApi(userA.userId, [roleMemberId]);

        // User B gets Test role only in Member tenant (no roles in Central)
        cy.addRolesToNewUserApi(userB.userId, [roleMemberId]);

        cy.resetTenant();
        cy.login(tempUser.username, tempUser.password);
      });
    });

    after('Delete users and test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      cy.deleteAuthorizationRoleApi(roleCentralId);
      cy.deleteAuthorizationRoleApi(roleUserAExtraId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(roleMemberId);
    });

    it(
      "C552458 ECS | Eureka | Compare different user's capabilities for two tenants (thunderjet)",
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552458'] },
      () => {
        // Step 1: Navigate to Consortium Manager and click Select members
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.waitLoading();
        SelectMembers.selectAllMembers();

        // Step 2: Verify members selected and save
        ConsortiumManagerApp.verifyMembersSelected(2);

        // Step 3: Navigate to Authorization roles
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.checkActionsButtonShown();
        AuthorizationRoles.checkRoleFound(testData.roleNameCentral);

        // Step 4: Click Compare users
        CompareRoles.clickCompareUsers();

        // Step 5-6: Select Central tenant and User A in left pane
        CompareRoles.checkAvailableTenants([tenantNames.central, tenantNames.college].sort(), 0);
        CompareRoles.selectMember(tenantNames.central, 0);
        CompareRoles.selectUser(userA.username, 0);

        // Step 7-8: Select Test role and verify capabilities highlighted
        CompareRoles.checkRolePresent(testData.roleNameCentral, true, 0);
        CompareRoles.checkRolePresent(testData.roleNameUserAExtra, true, 0);
        CompareRoles.selectRole(testData.roleNameCentral, 0);
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, true, 0);
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);

        // Step 9-10: Select Member tenant and User B in right pane
        CompareRoles.checkAvailableTenants([tenantNames.central, tenantNames.college].sort(), 1);
        CompareRoles.selectMember(tenantNames.college, 1);
        CompareRoles.selectUser(userB.username, 1);

        // Step 11-12: Select Test role and verify capability comparison
        CompareRoles.selectRole(testData.roleNameMember, 1);

        // Verify highlighting - only Procedural capability should be highlighted in left pane
        testData.capabilitiesForRoleCentral.forEach((capability, index) => {
          if (index === 0) {
            // Procedural capability - should be highlighted
            CompareRoles.checkCapability(capability, null, true, 0);
          } else {
            // Data capabilities - should not be highlighted
            CompareRoles.checkCapability(capability, null, false, 0);
          }
        });

        // Right pane capabilities should not be highlighted
        testData.capabilitiesForRoleMember.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, false, 1);
        });
        CompareRoles.verifyNoCapabilitySetsFound(1);

        // Step 13: Switch left pane to Member tenant
        CompareRoles.selectMember(tenantNames.college, 0);
        CompareRoles.verifyNoCapabilitiesFound(0);
        CompareRoles.verifyNoCapabilitySetsFound(0);

        // All capabilities on right pane should become highlighted
        testData.capabilitiesForRoleMember.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, true, 1);
        });

        // Step 14: Select User A and Test role in left pane
        CompareRoles.selectUser(userA.username, 0);
        CompareRoles.selectRole(testData.roleNameMember, 0);

        // Both panes should show same capabilities with no highlighting
        testData.capabilitiesForRoleMember.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, false, 0);
          CompareRoles.checkCapability(capability, null, false, 1);
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);
        CompareRoles.verifyNoCapabilitySetsFound(1);
      },
    );
  });
});
