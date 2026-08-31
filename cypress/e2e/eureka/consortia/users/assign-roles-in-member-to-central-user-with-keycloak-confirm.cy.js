import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleA: `AT_C1347149_UserRole_CA_${randomPostfix}`,
        collegeRoleA: `AT_C1347149_UserRole_M1A_${randomPostfix}`,
        universityRoleA: `AT_C1347149_UserRole_M2A_${randomPostfix}`,
      };

      const capabSetsToAssignCentral = [
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsEdit,
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiUsersRolesManage,
      ];

      const capabSetsToAssignMember = [
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiUsersRolesManage,
      ];

      const testUser = {};
      const users = {};
      const userBodies = {};
      const centralRoleIds = [];
      const collegeRoleIds = [];
      const universityRoleIds = [];
      const assignedUserIds = [];

      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((letter) => {
        userBodies[`user${letter}`] = {
          type: 'staff',
          active: true,
          username: `at_c1347149_user${letter.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1347149_LastName_${letter}_${randomPostfix}`,
            email: 'AT_C1347149@test.com',
            preferredContactTypeIds: ['002'],
          },
        };
      });

      before('Create users, roles', () => {
        cy.getAdminToken();

        // Create test (admin) user in Central
        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
          cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        });

        // Create Users A-G in Central without Keycloak records; assign College affiliation
        cy.getUserGroups().then((groupId) => {
          ['userA', 'userB', 'userC', 'userD', 'userE', 'userF', 'userG'].forEach((key) => {
            userBodies[key].patronGroup = groupId;
            Users.createViaApi(userBodies[key]).then((user) => {
              users[key] = {
                userId: user.id,
                username: userBodies[key].username,
                lastName: userBodies[key].personal.lastName,
              };
              assignedUserIds.push(user.id);
              cy.assignAffiliationToUser(Affiliations.College, user.id);
            });
          });
        });

        // Users D-G additionally get University affiliation
        cy.then(() => {
          ['userD', 'userE', 'userF', 'userG'].forEach((key) => {
            cy.assignAffiliationToUser(Affiliations.University, users[key].userId);
          });
        });

        // Create Central roles
        cy.createAuthorizationRoleApi(testData.centralRoleA).then((role) => {
          centralRoleIds.push(role.id);
        });

        // Switch to College (Member-1): assign testUser capabilities and create College roles
        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          cy.createAuthorizationRoleApi(testData.collegeRoleA).then((role) => {
            collegeRoleIds.push(role.id);
          });
        });

        // Switch to University (Member-2): assign testUser capabilities and create University roles
        cy.then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          cy.createAuthorizationRoleApi(testData.universityRoleA).then((role) => {
            universityRoleIds.push(role.id);
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        cy.visit(`${TopMenu.usersPath}/view/${users.userA.userId}`);
        UsersCard.waitLoading();
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
        'C1347149 ECS | Assign authorization roles in Member tenant to a user created in Central tenant, confirming user creation in Keycloak (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C1347149'] },
        () => {
          // Steps 1-3: User A — assign Central role; Keycloak modal for Central tenant
          UsersCard.verifyUserLastFirstNameInCard(users.userA.lastName);
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');

          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userA.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 4-5: User B — assign Central then Member-1; Keycloak modal for Central
          cy.visit(`${TopMenu.usersPath}/view/${users.userB.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userB.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userB.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 6-7: User C — assign Member-1 first then Central; Keycloak modal for Central
          cy.visit(`${TopMenu.usersPath}/view/${users.userC.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userC.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userC.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 8-9: User D (3 affiliations) — assign Member-1 + Central + Member-2; Keycloak modal for Central
          cy.visit(`${TopMenu.usersPath}/view/${users.userD.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userD.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userD.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Steps 10-11: User E (3 affiliations) — assign Central + Member-1 + Member-2; Keycloak modal for Central
          cy.visit(`${TopMenu.usersPath}/view/${users.userE.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userE.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userE.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Step 12: User F (3 affiliations) — assign Member-2 + Member-1 only; no Keycloak modal
          cy.visit(`${TopMenu.usersPath}/view/${users.userF.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userF.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Steps 13-14: User G (3 affiliations) — assign Member-1 + Member-2 + Central; Keycloak modal for Central
          cy.visit(`${TopMenu.usersPath}/view/${users.userG.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userG.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userG.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
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
