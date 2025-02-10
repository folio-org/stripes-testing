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
import DateTools from '../../../../support/utils/dateTools';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralRoleName: `C502978 Autotest Role Central ${randomPostfix}`,
      collegeRoleName: `C502978 Autotest Role College ${randomPostfix}`,
      collegeRoleNameDescription: `C502978 Autotest Description ${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
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
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Capabilities',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Role-Capability-Sets',
        action: CAPABILITY_ACTIONS.MANAGE,
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
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(testData.roleCollegeId);
    });

    it(
      'C502978 ECS | Eureka | Verify all columns are displayed in Authorization roles settings (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C502978'] },
      () => {
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManager.verifyMembersSelected(2);
        SelectMembers.selectMember(tenantNames.central);
        cy.resetTenant();
        cy.getAdminToken();
        cy.getAuthorizationRoles().then((rolesCentral) => {
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.verifyRolesCount(rolesCentral.length);
          AuthorizationRoles.checkRoleFound(testData.centralRoleName);
          AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);

          SelectMembers.selectMember(tenantNames.college);
          cy.setTenant(Affiliations.College);
          cy.getAuthorizationRoles().then((rolesCollege) => {
            AuthorizationRoles.waitContentLoading();
            AuthorizationRoles.verifyRolesCount(rolesCollege.length);
            AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
            AuthorizationRoles.checkRoleFound(testData.collegeRoleName);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              SETTINGS_SUBSECTION_AUTH_ROLES,
            );
            AuthorizationRoles.waitContentLoading();
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName, false);
            AuthorizationRoles.openForEdit();
            AuthorizationRoles.fillRoleNameDescription(
              testData.collegeRoleName,
              testData.collegeRoleNameDescription,
            );
            cy.intercept('PUT', '/roles/*').as('updateCall');
            AuthorizationRoles.clickSaveButton();
            cy.wait('@updateCall').then(() => {
              const updatedDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
              AuthorizationRoles.checkAfterSaveEdit(
                testData.collegeRoleName,
                testData.collegeRoleNameDescription,
              );

              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
              ConsortiumManager.verifyStatusOfConsortiumManager();
              ConsortiumManager.verifyMembersSelected(2);
              ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
              SelectMembers.selectMember(tenantNames.college);
              cy.setTenant(Affiliations.College);
              cy.getAuthorizationRoles().then((rolesCollegeNew) => {
                AuthorizationRoles.waitContentLoading();
                AuthorizationRoles.verifyRolesCount(rolesCollegeNew.length);
                AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
                AuthorizationRoles.verifyRoleRow(
                  testData.collegeRoleName,
                  testData.collegeRoleNameDescription,
                  updatedDateTime,
                  `${userData.lastName}, ${userData.firstName}`,
                );
              });
            });
          });
        });
      },
    );
  });
});
