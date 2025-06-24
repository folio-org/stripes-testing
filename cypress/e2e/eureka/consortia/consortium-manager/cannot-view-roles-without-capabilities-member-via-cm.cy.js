import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
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
      centralRoleName: `AT_C503095_UserRole_Central_${randomPostfix}`,
      collegeRoleName: `AT_C503095_UserRole_College_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignCollege = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Authorization-Roles Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let userData;

    before('Create user, data', () => {
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

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(testData.roleCollegeId);
    });

    it(
      'C503095 ECS | Eureka | User with insufficient capability sets for member tenant is not able to view authorization roles associated to that tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C503095'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password).then(() => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
          AuthorizationRoles.waitLoading();
          ConsortiumManager.clickSelectMembers();
          SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
          SelectMembers.checkMember(tenantNames.central, true);
          SelectMembers.checkMember(tenantNames.college, true);
          SelectMembers.saveAndClose();
          ConsortiumManager.verifyMembersSelected(2);
          AuthorizationRoles.closeAllCalloutsIfShown();

          SelectMembers.selectMember(tenantNames.central);
          AuthorizationRoles.checkRoleFound(testData.centralRoleName);
          AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);

          SelectMembers.selectMember(tenantNames.college);
          AuthorizationRoles.verifyAccessErrorShown();
          AuthorizationRoles.waitLoading();
        });
      },
    );
  });
});
