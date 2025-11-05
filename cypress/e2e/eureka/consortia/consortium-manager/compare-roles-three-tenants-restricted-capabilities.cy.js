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
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleNameCentral: `AT_C552443_UserRole_Central_${randomPostfix}`,
      roleNameCollege: `AT_C552443_UserRole_College_${randomPostfix}`,
      roleNameUniversity: `AT_C552443_UserRole_University_${randomPostfix}`,
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
      CapabilitySets.uiAuthorizationRolesSettingsView,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
    ];
    const capabSetsToAssignCollege = [CapabilitySets.uiAuthorizationRolesSettingsView];
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
      cy.resetTenant();
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
      'C552443 ECS | Eureka | Compare capabilities for three tenants (user has restricted capabilities in one tenant) (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C552443'] },
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

        CompareRoles.clickCompareRoles();
        CompareRoles.checkAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
          0,
        );
        CompareRoles.selectMember(tenantNames.central, 0);
        CompareRoles.selectRole(testData.roleNameCentral, 0);
        testData.capabilitiesForRoleCentral.forEach((capability) => {
          CompareRoles.checkCapability(capability, true, true, 0);
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);

        CompareRoles.checkAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
          1,
        );
        CompareRoles.selectMember(tenantNames.university, 1);
        AuthorizationRoles.verifyAccessErrorShown();
        CompareRoles.checkNoRolesPresent(1);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        CompareRoles.selectMember(tenantNames.central, 0);
        CompareRoles.selectRole(testData.roleNameCentral, 0);
        CompareRoles.verifyNoCapabilitySetsFound(0);
        CompareRoles.checkAvailableTenants([tenantNames.central, tenantNames.college].sort(), 1);

        CompareRoles.selectMember(tenantNames.college, 1);
        CompareRoles.verifySelectedRole(CompareRoles.selectRolePlaceholderText, 1);
        CompareRoles.clickOnCapabilitySetsAccordion(true, 1);
        CompareRoles.verifyNoCapabilitySetsFound(1);
        CompareRoles.clickOnCapabilitiesAccordion(true, 1);
        CompareRoles.verifyNoCapabilitiesFound(1);

        CompareRoles.selectRole(testData.roleNameCollege, 1);
        testData.capabilitiesForRoleCentral.forEach((capability, index) => {
          if (!index) CompareRoles.checkCapability(capability, true, true, 0);
          else CompareRoles.checkCapability(capability, true, false, 0);
        });
        CompareRoles.verifyNoCapabilitySetsFound(0);
        testData.capabilitiesForRoleCollege.forEach((capability) => {
          CompareRoles.checkCapability(capability, true, false, 1);
        });
        CompareRoles.verifyNoCapabilitySetsFound(1);

        CompareRoles.selectMember(tenantNames.college, 0);
        CompareRoles.verifySelectedRole('', 0);
        CompareRoles.verifyNoCapabilitiesFound(0);
        CompareRoles.verifyNoCapabilitySetsFound(0);
        testData.capabilitiesForRoleCollege.forEach((capability) => {
          CompareRoles.checkCapability(capability, true, true, 1);
        });
      },
    );
  });
});
