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

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C523606_Role ${randomPostfix}`,
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
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.PROCEDURAL,
        resource: 'UI-Consortia-Settings Consortium-Manager Share',
        action: CAPABILITY_ACTIONS.EXECUTE,
      },
    ];
    const capabSetsToAssignCollege = [
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
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Users Roles',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignUniversity = [
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
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
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
      // workaround for UICONSET-217 - rewrite to API when fixed
      cy.loginAsAdmin();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
      ConsortiumManagerApp.verifyStatusOfConsortiumManager();
      SelectMembers.selectAllMembers();
      ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
      SelectMembers.selectMember(tenantNames.central);
      AuthorizationRoles.waitLoading();
      AuthorizationRoles.clickActionsButton();
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.fillRoleNameDescription(testData.roleName);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
      cy.wait(10_000);

      cy.resetTenant();
      cy.getAdminToken();
      cy.getUserRoleIdByNameApi(testData.roleName).then((id) => {
        testData.roleId = id;
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, capabSetIds);
        cy.login(userAData.username, userAData.password);
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userAData.userId);
      Users.deleteViaApi(userBData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
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
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySets.forEach((capabilitySet) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
        });
        AuthorizationRoles.clickOnUsersAccordion();
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
        AuthorizationRoles.clickOnUsersAccordion();
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.clickCancelInAssignModal();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);

        cy.login(userBData.username, userBData.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.clickOnUsersAccordion();
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.clickCancelInAssignModal();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);
      },
    );
  });
});
