import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import DateTools from '../../../../support/utils/dateTools';
import ConsortiumManagerSettings from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralRoleName: `AT_C502981_AuthRole_Central_${randomPostfix}`,
      collegeRoleName: `AT_C502981_AuthRole_College_${randomPostfix}`,
      updatedDescription: `Updated description ${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
      CapabilitySets.uiAuthorizationRolesUsersSettingsView,
    ];
    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];
    const capabsToAssign = [Capabilities.settingsEnabled];
    let userData;
    let assignUserCentral;
    let assignUserCollege1;
    let assignUserCollege2;

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignCentral,
          );
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            testData.roleCentral = roleCentral;
          });
          cy.createTempUser([]).then((userProperties) => {
            assignUserCentral = userProperties;
          });
          cy.getCapabilitiesApi(2).then((capabs) => {
            testData.capabsCentral = capabs;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignMembers,
          );
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleCollege) => {
            testData.roleCollege = roleCollege;
          });
          cy.createTempUser([]).then((userProperties) => {
            assignUserCollege1 = userProperties;
          });
          cy.createTempUser([]).then((userProperties) => {
            assignUserCollege2 = userProperties;
          });
          cy.getCapabilitiesApi(2).then((capabs) => {
            testData.capabsCollege = capabs;
          });
        });
    });

    before('Assign capabilities, users', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addCapabilitiesToNewRoleApi(
        testData.roleCentral.id,
        testData.capabsCentral.map((capab) => capab.id),
      );
      cy.addRolesToNewUserApi(assignUserCentral.userId, [testData.roleCentral.id]);
      cy.setTenant(Affiliations.College);
      cy.addCapabilitiesToNewRoleApi(
        testData.roleCollege.id,
        testData.capabsCollege.map((capab) => capab.id),
      );
      cy.addRolesToNewUserApi(assignUserCollege1.userId, [testData.roleCollege.id]);
      cy.addRolesToNewUserApi(assignUserCollege2.userId, [testData.roleCollege.id]);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      Users.deleteViaApi(assignUserCentral.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCentral.id);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollege1.userId);
      Users.deleteViaApi(assignUserCollege2.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCollege.id);
    });

    it(
      'C502981 ECS | Eureka | Verify detail view of selected Authorization role (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C502981'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(testData.roleCentral.name);
        AuthorizationRoles.clickOnRoleName(testData.roleCentral.name);
        AuthorizationRoles.verifyRoleViewPane(
          testData.roleCentral.name,
          testData.roleCentral.description,
        );
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleCentral.name);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleCentral.name, false);
        AuthorizationRoles.verifyAssignedUsersAccordion(false, false);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCentral.lastName,
          assignUserCentral.firstName,
        );
        AuthorizationRoles.checkUsersAccordion(1);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(testData.roleCollege.name);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.clickOnRoleName(testData.roleCollege.name);
        AuthorizationRoles.verifyRoleViewPane(
          testData.roleCollege.name,
          testData.roleCollege.description,
        );
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleCollege.name);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleCollege.name, false);
        AuthorizationRoles.verifyAssignedUsersAccordion(false, false);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollege1.lastName,
          assignUserCollege1.firstName,
        );
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollege2.lastName,
          assignUserCollege2.firstName,
        );
        AuthorizationRoles.checkUsersAccordion(2);

        cy.waitForAuthRefresh(() => {
          ConsortiumManagerSettings.switchActiveAffiliation(
            tenantNames.central,
            tenantNames.college,
          );
          cy.reload();
        }, 20_000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleCollege.name);
        AuthorizationRoles.clickOnRoleName(testData.roleCollege.name);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(assignUserCollege1.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollege1.lastName,
          assignUserCollege1.firstName,
          false,
        );
        AuthorizationRoles.verifyAssignedUsersAccordion();
        AuthorizationRoles.openForEdit();
        AuthorizationRoles.fillRoleNameDescription(
          testData.roleCollege.name,
          testData.updatedDescription,
        );
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(
          testData.roleCollege.name,
          testData.updatedDescription,
        );
        const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });

        ConsortiumManagerSettings.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(testData.roleCollege.name);
        AuthorizationRoles.clickOnRoleName(testData.roleCollege.name);
        AuthorizationRoles.verifyRoleViewPane(
          testData.roleCollege.name,
          testData.updatedDescription,
        );
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollege1.lastName,
          assignUserCollege1.firstName,
          false,
        );
        AuthorizationRoles.verifyGeneralInformationWhenExpanded(
          '',
          '',
          updatedDate,
          `${userData.lastName}, ${userData.firstName}`,
        );
      },
    );
  });
});
