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
      roleName: `AT_C1030054_UserRole_${randomPostfix}`,
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
      capabilitySetsUniversity: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Notes Item',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
    };
    const roleNameCollegeUpdated = `${testData.roleName}_College`;
    const roleNamesUniversityUpdated = `${testData.roleName}_University`;
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
    const capabSetIdsUniversity = [];
    let testUser;
    let assignUserCentralData;
    let assignUserCollegeData;
    let assignUserUniversityData;
    let roleIdCentral;
    let roleIdCollege;
    let roleIdUniversity;

    testData.capabilitySetsCentral.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });
    testData.capabilitySetsCollege.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });
    testData.capabilitySetsUniversity.forEach((capabilitySet) => {
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
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
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
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          roleIdCollege = role.id;
        });
        testData.capabilitySetsCollege.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIdsCollege.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.University);
        cy.createTempUser([]).then((userProperties) => {
          assignUserUniversityData = userProperties;
        });
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          roleIdUniversity = role.id;
        });
        testData.capabilitySetsUniversity.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIdsUniversity.push(capabSetId);
          });
        });
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
          cy.setTenant(Affiliations.University);
          cy.addCapabilitySetsToNewRoleApi(roleIdUniversity, capabSetIdsUniversity);
          cy.addRolesToNewUserApi(assignUserUniversityData.userId, [roleIdUniversity]);
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
      cy.deleteSharedRoleApi({ id: roleIdCentral, name: testData.roleName }, true);
      cy.deleteAuthorizationRoleApi(roleIdCentral, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollegeData.userId);
      cy.deleteAuthorizationRoleApi(roleIdCollege);
      cy.setTenant(Affiliations.University);
      Users.deleteViaApi(assignUserUniversityData.userId);
      cy.deleteAuthorizationRoleApi(roleIdUniversity);
    });

    it(
      'C1030054 ECS | Authorization role cannot be shared if roles with the same name already exist in two member tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C1030054'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.verifyMembersSelected(3);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.shareRole(testData.roleName, { notShared: true });
        AuthorizationRoles.verifyShareNameError([tenantNames.college, tenantNames.university]);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.closeConfirmShareModal();
        AuthorizationRoles.closeRoleDetailView(testData.roleName);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
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

        AuthorizationRoles.openForEdit(testData.roleName);
        testData.capabilitySetsCollege.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.fillRoleNameDescription(roleNameCollegeUpdated);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(roleNameCollegeUpdated);
        AuthorizationRoles.closeRoleDetailView(roleNameCollegeUpdated);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsUniversity.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsUniversity.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserUniversityData.lastName,
          assignUserUniversityData.firstName,
        );
        AuthorizationRoles.closeRoleDetailView(testData.roleName);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.shareRole(testData.roleName, { notShared: true });
        AuthorizationRoles.verifyShareNameError(tenantNames.university);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.closeConfirmShareModal();
        AuthorizationRoles.closeRoleDetailView(testData.roleName);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(roleNameCollegeUpdated);
        AuthorizationRoles.clickOnRoleName(roleNameCollegeUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCollegeUpdated, false);
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
        AuthorizationRoles.closeRoleDetailView(roleNameCollegeUpdated);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsUniversity.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsUniversity.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserUniversityData.lastName,
          assignUserUniversityData.firstName,
        );

        AuthorizationRoles.openForEdit(testData.roleName);
        testData.capabilitySetsUniversity.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.fillRoleNameDescription(roleNamesUniversityUpdated);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(roleNamesUniversityUpdated);
        AuthorizationRoles.closeRoleDetailView(roleNamesUniversityUpdated);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCentral.length}`,
        );
        AuthorizationRoles.shareRole(testData.roleName);
        AuthorizationRoles.closeRoleDetailView(testData.roleName);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(roleNameCollegeUpdated);
        AuthorizationRoles.clickOnRoleName(roleNameCollegeUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNameCollegeUpdated, false);
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
        AuthorizationRoles.closeRoleDetailView(roleNameCollegeUpdated);

        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, true);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsCentral.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsCentral.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.closeRoleDetailView(testData.roleName);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(roleNamesUniversityUpdated);
        AuthorizationRoles.clickOnRoleName(roleNamesUniversityUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(roleNamesUniversityUpdated, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.capabilitySetsUniversity.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySetsUniversity.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserUniversityData.lastName,
          assignUserUniversityData.firstName,
        );
        AuthorizationRoles.closeRoleDetailView(roleNamesUniversityUpdated);

        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, true);
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
