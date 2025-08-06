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
      roleNameCentral: `AT_C552456_TestRole_Central_${randomPostfix}`,
      roleNameCollege: `AT_C552456_TestRole_College_${randomPostfix}`,
      roleNameUniversity: `AT_C552456_TestRole_University_${randomPostfix}`,
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
      capabilitiesForRoleCollege: [
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
      capabilitySetsForRoleUniversity: [
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
          resource: 'UI-Finance Fund-Budget',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignCollege = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabIdsCentral = [];
    const capabIdsCollege = [];
    const capabSetIdsUniversity = [];
    let tempUser;
    let userA;
    let roleCentralId;
    let roleCollegeId;
    let roleUniversityId;

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          tempUser = userProperties;
          cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignCentral);
        });
        cy.createTempUser([]).then((userAProperties) => {
          userA = userAProperties;
        });
      }).then(() => {
        cy.assignAffiliationToUser(Affiliations.College, tempUser.userId);
        cy.assignAffiliationToUser(Affiliations.University, tempUser.userId);
        cy.assignAffiliationToUser(Affiliations.College, userA.userId);
        cy.assignAffiliationToUser(Affiliations.University, userA.userId);
        cy.createAuthorizationRoleApi(testData.roleNameCentral).then((role) => {
          roleCentralId = role.id;
        });
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          capability.type = capability.table;
          cy.getCapabilityIdViaApi(capability).then((capabId) => {
            capabIdsCentral.push(capabId);
          });
        });
        cy.setTenant(Affiliations.College);
        cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignCollege);
        cy.createAuthorizationRoleApi(testData.roleNameCollege).then((role) => {
          roleCollegeId = role.id;
        });
        testData.capabilitiesForRoleCollege.forEach((capability) => {
          capability.type = capability.table;
          cy.getCapabilityIdViaApi(capability).then((capabId) => {
            capabIdsCollege.push(capabId);
          });
        });
        cy.setTenant(Affiliations.University);
        // Note: tempUser intentionally does NOT get capabilities assigned in University tenant
        cy.createAuthorizationRoleApi(testData.roleNameUniversity).then((role) => {
          roleUniversityId = role.id;
        });
        testData.capabilitySetsForRoleUniversity.forEach((set) => {
          set.type = set.table;
          cy.getCapabilitySetIdViaApi(set).then((capabSetId) => {
            capabSetIdsUniversity.push(capabSetId);
          });
        });
      });
    });

    before('Assign capabilities, roles and login', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.then(() => {
        cy.addCapabilitiesToNewRoleApi(roleCentralId, capabIdsCentral);
        cy.setTenant(Affiliations.College);
        cy.addCapabilitiesToNewRoleApi(roleCollegeId, capabIdsCollege);
        cy.setTenant(Affiliations.University);
        cy.addCapabilitySetsToNewRoleApi(roleUniversityId, capabSetIdsUniversity);
      }).then(() => {
        cy.resetTenant();
        cy.addRolesToNewUserApi(userA.userId, [roleCentralId]);
        cy.setTenant(Affiliations.College);
        cy.addRolesToNewUserApi(userA.userId, [roleCollegeId]);
        cy.setTenant(Affiliations.University);
        cy.addRolesToNewUserApi(userA.userId, [roleUniversityId]);

        cy.resetTenant();
        cy.login(tempUser.username, tempUser.password);
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      Users.deleteViaApi(userA.userId);
      cy.deleteAuthorizationRoleApi(roleCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(roleCollegeId);
      cy.setTenant(Affiliations.University);
      cy.deleteAuthorizationRoleApi(roleUniversityId);
    });

    it(
      "C552456 ECS | Eureka | Compare user's capabilities for three tenants (user has restricted capabilities in one tenant) (consortia) (thunderjet)",
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552456'] },
      () => {
        // Step 1: Select all members
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.waitLoading();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(3);

        // Step 2: Navigate to Authorization roles
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.checkActionsButtonShown();
        AuthorizationRoles.checkRoleFound(testData.roleNameCentral);

        // Step 3: Open Compare users
        CompareRoles.clickCompareUsers();

        // Step 4: Select Central tenant, User A, and Test role on left pane
        CompareRoles.selectMember(tenantNames.central, 0);
        CompareRoles.selectUser(userA.username, 0);
        CompareRoles.selectRole(testData.roleNameCentral, 0);
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, true, 0);
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);

        // Step 5: Check available tenants in right pane
        CompareRoles.checkAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
          1,
        );

        // Step 6: Select Member 2 (University) tenant - should show error
        CompareRoles.selectMember(tenantNames.university, 1);
        AuthorizationRoles.verifyAccessErrorShown();
        CompareRoles.checkNoUsersPresent(1);
        CompareRoles.checkRolesDropdownDisabled(1);

        // Step 7: Unselect Member 2 tenant
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);

        // Select options in the left pane again
        CompareRoles.selectMember(tenantNames.central, 0);
        CompareRoles.selectUser(userA.username, 0);
        CompareRoles.selectRole(testData.roleNameCentral, 0);

        // Step 8: Verify only Central and Member 1 available in right pane
        CompareRoles.checkAvailableTenants([tenantNames.central, tenantNames.college].sort(), 1);

        // Step 9: Select Member 1 tenant in right pane
        CompareRoles.selectMember(tenantNames.college, 1);
        CompareRoles.selectUser(userA.username, 1);
        CompareRoles.verifyNoCapabilitiesFound(1);
        CompareRoles.verifyNoCapabilitySetsFound(1);

        // Step 10: Select Test role in right pane
        CompareRoles.selectRole(testData.roleNameCollege, 1);

        // Verify capabilities comparison between Central (left) and Member 1 (right)
        testData.capabilitiesForRoleCentral.forEach((capability, index) => {
          if (index === 0) {
            // First capability (Procedural) should be highlighted in Central (not in Member 1)
            CompareRoles.checkCapability(capability, null, true, 0);
          } else {
            // Other capabilities should not be highlighted in Central
            CompareRoles.checkCapability(capability, null, false, 0);
          }
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);

        testData.capabilitiesForRoleCollege.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, false, 1);
        });
        CompareRoles.verifyNoCapabilitySetsFound(1);

        // Step 11: Select Member 1 tenant in left pane
        CompareRoles.selectMember(tenantNames.college, 0);
        CompareRoles.verifySelectedRole('', 0);
        CompareRoles.verifySelectedUser('', 0);
        CompareRoles.verifyNoCapabilitiesFound(0);
        CompareRoles.verifyNoCapabilitySetsFound(0);

        // All capabilities on right pane should be highlighted
        testData.capabilitiesForRoleCollege.forEach((capability) => {
          CompareRoles.checkCapability(capability, null, true, 1);
        });
      },
    );
  });
});
