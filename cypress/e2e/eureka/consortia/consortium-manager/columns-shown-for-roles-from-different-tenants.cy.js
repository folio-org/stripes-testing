import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Capabilities from '../../../../support/dictionary/capabilities';
import DateTools from '../../../../support/utils/dateTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralRoleName: `AT_C502978_UserRole_Central_${randomPostfix}`,
      collegeRoleName: `AT_C502978_UserRole_College_${randomPostfix}`,
      collegeRoleNameDescription: `C502978 Autotest Description ${randomPostfix}`,
      getUpdatedDate: () => DateTools.getFormattedDateWithSlashes({ date: new Date() }),
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
    ];
    const capabSetsToAssignCollege = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.capabilities,
      CapabilitySets.roleCapabilitySets,
    ];
    const capabsToAssignCollege = [Capabilities.settingsEnabled];
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
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssignCollege,
            capabSetsToAssignCollege,
          );
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
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        SelectMembers.selectMember(tenantNames.central);
        cy.resetTenant();
        cy.getAuthorizationRoles().then((rolesCentral) => {
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.verifyRolesCount(rolesCentral.length, { plusMinus: 2 });
          AuthorizationRoles.checkRoleFound(testData.centralRoleName);
          AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);

          SelectMembers.selectMember(tenantNames.college);
          cy.setTenant(Affiliations.College);
          cy.getAuthorizationRoles().then((rolesCollege) => {
            AuthorizationRoles.waitContentLoading();
            AuthorizationRoles.verifyRolesCount(rolesCollege.length, { plusMinus: 2 });
            AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
            AuthorizationRoles.checkRoleFound(testData.collegeRoleName);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              SETTINGS_SUBSECTION_AUTH_ROLES,
            );
            AuthorizationRoles.waitContentLoading();
            AuthorizationRoles.searchRole(testData.collegeRoleName);
            AuthorizationRoles.clickOnRoleName(testData.collegeRoleName, false);
            AuthorizationRoles.openForEdit();
            AuthorizationRoles.fillRoleNameDescription(
              testData.collegeRoleName,
              testData.collegeRoleNameDescription,
            );
            AuthorizationRoles.clickSaveButton();
            const updatedDate = testData.getUpdatedDate();
            AuthorizationRoles.checkAfterSaveEdit(
              testData.collegeRoleName,
              testData.collegeRoleNameDescription,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            ConsortiumManagerApp.verifyMembersSelected(2);
            ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
            SelectMembers.selectMember(tenantNames.college);
            cy.setTenant(Affiliations.College);
            cy.getAuthorizationRoles().then((rolesCollegeNew) => {
              AuthorizationRoles.waitContentLoading();
              AuthorizationRoles.verifyRolesCount(rolesCollegeNew.length, { plusMinus: 2 });
              AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
              AuthorizationRoles.verifyRoleRow(
                testData.collegeRoleName,
                testData.collegeRoleNameDescription,
                updatedDate,
                `${userData.lastName}, ${userData.firstName}`,
              );
            });
          });
        });
      },
    );
  });
});
