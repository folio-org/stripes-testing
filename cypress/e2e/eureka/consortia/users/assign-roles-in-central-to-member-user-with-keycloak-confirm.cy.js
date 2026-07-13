import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleA: `AT_C1347151_UserRole_CA_${randomPostfix}`,
        centralRoleB: `AT_C1347151_UserRole_CB_${randomPostfix}`,
        collegeRoleA: `AT_C1347151_UserRole_M1A_${randomPostfix}`,
        collegeRoleB: `AT_C1347151_UserRole_M1B_${randomPostfix}`,
        universityRoleA: `AT_C1347151_UserRole_M2A_${randomPostfix}`,
        universityRoleB: `AT_C1347151_UserRole_M2B_${randomPostfix}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.rolesUsers,
        CapabilitySets.uiUsersView,
        CapabilitySets.uiUsersRolesManage,
      ];
      const capabsToAssign = [
        Capabilities.settingsEnabled,
        Capabilities.consortiaUserTenantsCollection,
        Capabilities.usersKeycloakAuthUsersItem,
        Capabilities.usersKeycloakAuthUsersItemCreate,
      ];

      const testUser = {};
      const users = {};
      const centralRoleIds = [];
      const collegeRoleIds = [];
      const universityRoleIds = [];
      const assignedUserIds = [];

      before('Create users, roles', () => {
        cy.getAdminToken();

        // Create test (admin) user
        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
          cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
          cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
        });

        // Create Users A-H in Central (home=Central, College affiliation added manually → no College Keycloak)
        ['userA', 'userB', 'userC', 'userD', 'userE', 'userF', 'userG', 'userH'].forEach((key) => {
          cy.createTempUser([]).then((props) => {
            users[key] = props;
            assignedUserIds.push(props.userId);
            cy.assignAffiliationToUser(Affiliations.College, props.userId);
          });
        });

        // Users E-H additionally get University affiliation
        cy.then(() => {
          ['userE', 'userF', 'userG', 'userH'].forEach((key) => {
            cy.assignAffiliationToUser(Affiliations.University, users[key].userId);
          });
        });

        // Create Central roles
        [testData.centralRoleA, testData.centralRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => centralRoleIds.push(role.id));
        });

        // Create College roles
        cy.setTenant(Affiliations.College);
        cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
        [testData.collegeRoleA, testData.collegeRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => collegeRoleIds.push(role.id));
        });

        // Create University roles
        cy.setTenant(Affiliations.University);
        cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
        [testData.universityRoleA, testData.universityRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => universityRoleIds.push(role.id));
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        Users.waitLoading();
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        centralRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        Users.deleteViaApi(testUser.userId);
        assignedUserIds.forEach((id) => Users.deleteViaApi(id));
        cy.setTenant(Affiliations.College);
        collegeRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        cy.setTenant(Affiliations.University);
        universityRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
      });

      it(
        'C1347151 ECS | Assign authorization roles in Central tenant to a user created in Member tenant, confirming user creation in Keycloak (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C1347151'] },
        () => {
          // Steps 1-2: User A — assign Central role only; no Keycloak modal
          UsersSearchPane.searchByUsername(users.userA.username);
          UsersSearchPane.openUser(users.userA.username);
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');

          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 3-4: User B — assign College role; Keycloak modal expected for Member-1
          UsersSearchPane.searchByUsername(users.userB.username);
          UsersSearchPane.openUser(users.userB.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userB.lastName, users.userB.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 5-6: User C — assign Central first, then College; Keycloak modal for Member-1
          UsersSearchPane.searchByUsername(users.userC.username);
          UsersSearchPane.openUser(users.userC.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userC.lastName, users.userC.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 7-8: User D — assign College first, then Central; Keycloak modal for Member-1
          UsersSearchPane.searchByUsername(users.userD.username);
          UsersSearchPane.openUser(users.userD.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userD.lastName, users.userD.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 9-10: User E (3 affiliations) — assign College + Central + University; Keycloak modal for Member-1
          UsersSearchPane.searchByUsername(users.userE.username);
          UsersSearchPane.openUser(users.userE.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userE.lastName, users.userE.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Steps 11-12: User F (3 affiliations) — assign University + Central + College; Keycloak modal for Member-1
          UsersSearchPane.searchByUsername(users.userF.username);
          UsersSearchPane.openUser(users.userF.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userF.lastName, users.userF.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Step 13: User F again — assign additional College + Central roles; no Keycloak modal (already created)
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA, testData.collegeRoleB]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA, testData.centralRoleB]);

          // Step 14-15: Switch to University affiliation; User G — assign College + University; Keycloak modal for Member-1
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(users.userG.username);
          UsersSearchPane.openUser(users.userG.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userG.lastName, users.userG.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Steps 16-17: User H — assign University + College + Central; Keycloak modal for Member-1
          UsersSearchPane.searchByUsername(users.userH.username);
          UsersSearchPane.openUser(users.userH.username);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userH.lastName, users.userH.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
        },
      );
    });
  });
});
