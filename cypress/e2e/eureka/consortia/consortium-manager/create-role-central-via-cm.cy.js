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
      roleName: `AT_C523671_UserRole_${randomPostfix}`,
      roleDescription: `C523671 Autotest Description ${randomPostfix}`,
      existingRoleName: `AT_C523671_UserRole_Existing_${randomPostfix}`,
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
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.EDIT,
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
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let tempUser;

    before('Create user, data', () => {
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
          cy.createAuthorizationRoleApi(testData.existingRoleName).then((roleExisting) => {
            testData.roleExistingId = roleExisting.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            tempUser.userId,
            capabsToAssign,
            capabSetsToAssignCollege,
          );
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      cy.getUserRoleIdByNameApi(testData.roleName).then((roleNewId) => {
        cy.deleteAuthorizationRoleApi(roleNewId);
      });
    });

    it(
      'C523671 ECS | Eureka | Create authorization role for "Central" tenant through "Consortium manager" (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523671'] },
      () => {
        cy.resetTenant();
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.fillRoleNameDescription(testData.existingRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifyCreateNameError();
        AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectApplicationInModal(testData.applicationName);
        AuthorizationRoles.clickSaveInModal();
        testData.capabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(testData.roleName);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.verifyRolesCount(0);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.verifyRolesCount(0);
      },
    );
  });
});
