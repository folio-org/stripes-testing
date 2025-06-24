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

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralRoleName: `AT_C523582_UserRole_Central_${randomPostfix}`,
      centralRoleName2: `AT_C523582_UserRole_Central_New_${randomPostfix}`,
      collegeRoleName: `AT_C523582_UserRole_College_${randomPostfix}`,
      collegeRoleName2: `AT_C523582_UserRole_College_New_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
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
    let userData;

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            testData.roleCentralId = roleCentral.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCollege);
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleCollege) => {
            testData.roleCollegeId = roleCollege.id;
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCentralId);
      cy.getUserRoleIdByNameApi(testData.centralRoleName2).then((createdRoleCentralId) => {
        cy.deleteAuthorizationRoleApi(createdRoleCentralId, true);

        cy.setTenant(Affiliations.College);
        cy.deleteAuthorizationRoleApi(testData.roleCollegeId);
        cy.getUserRoleIdByNameApi(testData.collegeRoleName2).then((createdRoleCollegeId) => {
          cy.deleteAuthorizationRoleApi(createdRoleCollegeId, true);
        });
      });
    });

    it(
      'C523582 ECS | Eureka | User with insufficient capabilities cannot add authorization role through "Consortium manager" (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523582'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.fillRoleNameDescription(testData.centralRoleName2);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifyCreateAccessError();
        AuthorizationRoles.closeRoleCreateView();
        AuthorizationRoles.searchRole(testData.centralRoleName);
        AuthorizationRoles.clickOnRoleName(testData.centralRoleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.centralRoleName);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.fillRoleNameDescription(testData.collegeRoleName2);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifyCreateAccessError();
        AuthorizationRoles.closeRoleCreateView();
        AuthorizationRoles.searchRole(testData.collegeRoleName);
        AuthorizationRoles.clickOnRoleName(testData.collegeRoleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.collegeRoleName);
      },
    );
  });
});
