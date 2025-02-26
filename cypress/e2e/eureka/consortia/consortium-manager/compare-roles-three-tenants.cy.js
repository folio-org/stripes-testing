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
// import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleNameCentral: `AT_C552363_Role_Central_${randomPostfix}`,
      roleNameCollege: `AT_C552363_Role_College_${randomPostfix}`,
      roleNameUniversity: `AT_C552363_Role_University_${randomPostfix}`,
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
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
    ];
    let tempUser;
    let roleCentralId;
    let roleCollegeId;
    let roleUniversityId;
    const capabIdsCentral = [];
    const capabIdsCollege = [];
    const capabSetIdsUniversity = [];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          tempUser = userProperties;
          cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, tempUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, tempUser.userId);
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
          cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignMembers);
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
          cy.wait(10_000);
          cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssignMembers);
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

    before('Assign capabilities and login', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addCapabilitiesToNewRoleApi(roleCentralId, capabIdsCentral);
      cy.setTenant(Affiliations.College);
      cy.addCapabilitiesToNewRoleApi(roleCollegeId, capabIdsCollege);
      cy.setTenant(Affiliations.University);
      cy.addCapabilitySetsToNewRoleApi(roleUniversityId, capabSetIdsUniversity);
      cy.login(tempUser.username, tempUser.password);
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      cy.deleteAuthorizationRoleApi(roleCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(roleCollegeId);
      cy.setTenant(Affiliations.University);
      cy.deleteAuthorizationRoleApi(roleUniversityId);
    });

    it(
      'C552363 ECS | Eureka | Compare authorization role capabilities for three tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C552363'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.waitLoading();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(3);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.checkActionsButtonShown();
        AuthorizationRoles.checkRoleFound(testData.roleNameCentral);
        AuthorizationRoles.clickOnRoleName(testData.roleNameCentral);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
        AuthorizationRoles.checkCapabilitiesAccordionCounter(
          `${testData.capabilitiesForRoleCentral.length}`,
        );
        AuthorizationRoles.closeRoleDetailView(testData.roleNameCentral);

        AuthorizationRoles.compareRoles();
        AuthorizationRoles.checkAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
          0,
        );
        AuthorizationRoles.selectMemberForCompare(tenantNames.college, 0);
        AuthorizationRoles.selectRoleForCompare(testData.roleNameCentral, 0);
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          AuthorizationRoles.checkCapabilityForCompare(capability, true, true, 0);
        });
        AuthorizationRoles.verifyNoCapabilitySetsFoundForCompare(0);

        // AuthorizationRoles.waitContentLoading();
        // ConsortiumManagerApp.clickSelectMembers();
        // SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        // SelectMembers.checkMember(tenantNames.central, true);
        // SelectMembers.checkMember(tenantNames.college, true);
        // SelectMembers.saveAndClose();
        // SelectMembers.selectMember(tenantNames.central);
        // AuthorizationRoles.waitContentLoading();
        // AuthorizationRoles.clickActionsButton();
        // AuthorizationRoles.clickNewButton();
        // AuthorizationRoles.fillRoleNameDescription(testData.existingRoleName);
        // AuthorizationRoles.clickSaveButton();
        // AuthorizationRoles.verifyCreateNameError();
        // AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        // AuthorizationRoles.clickSelectApplication();
        // AuthorizationRoles.selectApplicationInModal(testData.applicationName);
        // AuthorizationRoles.clickSaveInModal();
        // testData.capabilitySets.forEach((set) => {
        //   AuthorizationRoles.selectCapabilitySetCheckbox(set);
        // });
        // AuthorizationRoles.clickSaveButton();
        // AuthorizationRoles.checkAfterSaveCreate(testData.roleName);

        // SelectMembers.selectMember(tenantNames.college);
        // AuthorizationRoles.waitContentLoading();
        // AuthorizationRoles.searchRole(testData.roleName);
        // AuthorizationRoles.verifyRolesCount(0);
        // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        // AuthorizationRoles.waitContentLoading();
        // AuthorizationRoles.searchRole(testData.roleName);
        // AuthorizationRoles.checkRoleFound(testData.roleName);

        // ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        // AuthorizationRoles.waitContentLoading();
        // AuthorizationRoles.searchRole(testData.roleName);
        // AuthorizationRoles.verifyRolesCount(0);
      },
    );
  });
});
