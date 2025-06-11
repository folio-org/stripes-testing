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

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C523593_UserRole_${randomPostfix}`,
      roleDescription: `C523593 Autotest Description ${randomPostfix}`,
      applicationName: 'app-platform-minimal',
      filtername: 'Status',
      optionName: 'Active',
      capabilitySets: [
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'Login',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'Settings Notes Enabled',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
    };
    const capabSetsToAssignCentral = [
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
    ];
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignCollege = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
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
    ];
    let tempUser;
    let userCentral;
    let userCollege;

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          tempUser = userProperties;
          cy.assignCapabilitiesToExistingUser(
            tempUser.userId,
            capabsToAssign,
            capabSetsToAssignCentral,
          );
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, tempUser.userId);
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            testData.roleCentralId = roleCentral.id;
          });
          cy.createTempUser([]).then((userProperties) => {
            userCentral = userProperties;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            tempUser.userId,
            capabsToAssign,
            capabSetsToAssignCollege,
          );
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleCollege) => {
            testData.roleCollegeId = roleCollege.id;
          });
          cy.createTempUser([]).then((userProperties) => {
            userCollege = userProperties;
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      Users.deleteViaApi(userCentral.userId);
      cy.getUserRoleIdByNameApi(testData.roleName).then((roleCentralId) => {
        cy.deleteAuthorizationRoleApi(roleCentralId, true);

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(userCollege.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleCollegeId) => {
          cy.deleteAuthorizationRoleApi(roleCollegeId, true);
        });
      });
    });

    it(
      'C523593 ECS | Eureka | Create authorization role for member tenant through "Consortium manager" (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523593'] },
      () => {
        cy.resetTenant();
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifyCreateAccessError();
        AuthorizationRoles.closeRoleCreateView();

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.checkSaveButton(false);
        ConsortiumManagerApp.verifySelectMembersButton(false);
        AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectApplicationInModal(testData.applicationName);
        AuthorizationRoles.clickSaveInModal();
        testData.capabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.clickAssignUsersButton();
        cy.wait(3000);
        AuthorizationRoles.selectFilterOptionInAssignModal(
          testData.filtername,
          testData.optionName,
          true,
          true,
        );
        AuthorizationRoles.verifyUserFoundInModal(userCentral.username, false);
        AuthorizationRoles.verifyUserFoundInModal(userCollege.username);

        AuthorizationRoles.clickResetAllInAssignModal();
        AuthorizationRoles.selectUserInModal(userCollege.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(userCollege.lastName, userCollege.firstName);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.verifyRolesCount(0);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.capabilitySets.forEach((capabilitySet) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
        });
        AuthorizationRoles.verifyAssignedUser(userCollege.lastName, userCollege.firstName);
        AuthorizationRoles.openForEdit();
        AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName, testData.roleDescription);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.verifyRoleRow(testData.roleName, testData.roleDescription);
      },
    );
  });
});
