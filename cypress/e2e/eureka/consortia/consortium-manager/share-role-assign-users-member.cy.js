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
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C523606_UserRole_${randomPostfix}`,
      capabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Login',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'Settings Notes Enabled',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
      CapabilitySets.consortiaSharingRolesAllItemDelete,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
    ];
    const capabSetsToAssignCollege = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiUsersRolesView,
    ];
    const capabSetsToAssignUniversity = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
    ];
    const capabsToAssign = [Capabilities.settingsEnabled];
    const capabSetIds = [];
    let userAData;
    let userBData;
    let assignUser1Data;
    let assignUser2Data;

    testData.capabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          userAData = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          userBData = userProperties;
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(
          userAData.userId,
          capabsToAssign,
          capabSetsToAssignCentral,
        );
        cy.assignAffiliationToUser(Affiliations.College, userAData.userId);
        cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
        });
        testData.capabilitySets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIds.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((userProperties) => {
          assignUser1Data = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          assignUser2Data = userProperties;
        });
        cy.assignCapabilitiesToExistingUser(
          userAData.userId,
          capabsToAssign,
          capabSetsToAssignCollege,
        );
        cy.setTenant(Affiliations.University);
        cy.wait(10000);
        cy.assignCapabilitiesToExistingUser(
          userBData.userId,
          capabsToAssign,
          capabSetsToAssignUniversity,
        );
      });
    });

    before('Assign capabilities to role, login', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addCapabilitySetsToNewRoleApi(testData.roleId, capabSetIds);
      cy.login(userAData.username, userAData.password);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userAData.userId);
      Users.deleteViaApi(userBData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUser1Data.userId);
      Users.deleteViaApi(assignUser2Data.userId);
    });

    it(
      'C523606 ECS | Eureka | Share authorization role and assign users to it from member tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523606'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.shareRole(testData.roleName);
        AuthorizationRoles.clickActionsButton(testData.roleName);
        AuthorizationRoles.checkShareToAllButtonShown(false);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySets.forEach((capabilitySet) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(assignUser1Data.username);
        AuthorizationRoles.selectUserInModal(assignUser2Data.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.checkUsersAccordion(2);
        AuthorizationRoles.verifyAssignedUser(
          assignUser1Data.lastName,
          assignUser1Data.firstName,
          true,
        );
        AuthorizationRoles.verifyAssignedUser(
          assignUser2Data.lastName,
          assignUser2Data.firstName,
          true,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByKeywords(assignUser1Data.userId);
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleName]);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.closeAssignModal();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);

        cy.login(userBData.username, userBData.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.closeAssignModal();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);

        cy.login(userAData.username, userAData.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
        AuthorizationRoles.clickDeleteRole(testData.roleName);
        AuthorizationRoles.confirmDeleteRole(testData.roleName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);
      },
    );
  });
});
