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
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleNamePrefix: `AT_C692096_UserRole_${randomPostfix}`,
      capabilitySetsCentral: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Fund-Budget',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      capabilitySetsCollege: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Invoice Invoice',
          action: CAPABILITY_ACTIONS.CREATE,
        },
      ],
    };
    const roleNameCentral = testData.roleNamePrefix;
    const roleNameCollege = roleNameCentral.toLowerCase();
    const roleNameCentralUpdated = `${roleNameCentral}_Updated`;
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
    ];
    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];

    const capabSetIdsCentral = [];
    const capabSetIdsCollege = [];
    let testUser;
    let assignUserCentralData;
    let assignUserCollegeData;
    let roleIdCentral;
    let roleIdCollege;

    testData.capabilitySetsCentral.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });
    testData.capabilitySetsCollege.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          assignUserCentralData = userProperties;
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
        cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
        cy.createAuthorizationRoleApi(roleNameCentral).then((role) => {
          roleIdCentral = role.id;
        });
        testData.capabilitySetsCentral.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIdsCentral.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((userProperties) => {
          assignUserCollegeData = userProperties;
        });
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
        cy.createAuthorizationRoleApi(roleNameCollege).then((role) => {
          roleIdCollege = role.id;
        });
        testData.capabilitySetsCollege.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIdsCollege.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.University);
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
      });
    });

    before('Assign capabilities, roles, login', () => {
      cy.then(() => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.addCapabilitySetsToNewRoleApi(roleIdCentral, capabSetIdsCentral);
        cy.addRolesToNewUserApi(assignUserCentralData.userId, [roleIdCentral]);
      })
        .then(() => {
          cy.setTenant(Affiliations.College);
          cy.addCapabilitySetsToNewRoleApi(roleIdCollege, capabSetIdsCollege);
          cy.addRolesToNewUserApi(assignUserCollegeData.userId, [roleIdCollege]);
        })
        .then(() => {
          cy.resetTenant();
          cy.login(testUser.username, testUser.password);
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(assignUserCentralData.userId);
      cy.deleteSharedRoleApi({ id: roleIdCentral, name: roleNameCentralUpdated }, true);
      cy.deleteAuthorizationRoleApi(roleIdCentral, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollegeData.userId);
      cy.deleteAuthorizationRoleApi(roleIdCollege);
    });

    it(
      'C692096 ECS | Authorization role cannot be shared if a role with the same name already exists in member tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C692096'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
        );
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.verifyMembersSelected(3);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(roleNameCentral);
        AuthorizationRoles.clickOnRoleName(roleNameCentral);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCentral, false);
        AuthorizationRoles.shareRole(roleNameCentral, { notShared: true });
        AuthorizationRoles.verifyShareNameError(tenantNames.college);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCentral, false);
        AuthorizationRoles.closeConfirmShareModal();
        AuthorizationRoles.closeRoleDetailView(roleNameCentral);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(roleNameCollege);
        AuthorizationRoles.clickOnRoleName(roleNameCollege);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCollege, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCollege.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsCollege.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollegeData.lastName,
          assignUserCollegeData.firstName,
        );
        AuthorizationRoles.closeRoleDetailView(roleNameCollege);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(roleNameCentral);
        AuthorizationRoles.verifyRolesCount(0);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(roleNameCentral);
        AuthorizationRoles.clickOnRoleName(roleNameCentral);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCentral, false);
        AuthorizationRoles.openForEdit(roleNameCentral);
        testData.capabilitySetsCentral.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.fillRoleNameDescription(roleNameCentralUpdated);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(roleNameCentralUpdated);

        AuthorizationRoles.shareRole(roleNameCentralUpdated);
        AuthorizationRoles.closeRoleDetailView(roleNameCentralUpdated);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(roleNameCollege);
        AuthorizationRoles.clickOnRoleName(roleNameCollege);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCollege, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCollege.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsCollege.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollegeData.lastName,
          assignUserCollegeData.firstName,
        );
        AuthorizationRoles.closeRoleDetailView(roleNameCollege);

        AuthorizationRoles.searchRole(roleNameCentralUpdated);
        AuthorizationRoles.clickOnRoleName(roleNameCentralUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCentralUpdated, true);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCentral.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsCentral.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.closeRoleDetailView(roleNameCentralUpdated);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(roleNameCentralUpdated);
        AuthorizationRoles.clickOnRoleName(roleNameCentralUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCentralUpdated, true);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCentral.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsCentral.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
      },
    );
  });
});
