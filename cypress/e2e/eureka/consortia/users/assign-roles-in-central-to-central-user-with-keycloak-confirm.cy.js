import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleA: `AT_C1347148_UserRole_CA_${randomPostfix}`,
        centralRoleB: `AT_C1347148_UserRole_CB_${randomPostfix}`,
        collegeRoleA: `AT_C1347148_UserRole_M1A_${randomPostfix}`,
        collegeRoleB: `AT_C1347148_UserRole_M1B_${randomPostfix}`,
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
      const assignedUserIds = [];

      // User A has NO College affiliation (Central only); B-E have College affiliation
      ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
        userBodies[`user${letter}`] = {
          type: 'staff',
          active: true,
          username: `at_c1347148_user${letter.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1347148_LastName_${letter}_${randomPostfix}`,
            email: 'AT_C1347148@test.com',
            preferredContactTypeIds: ['002'],
          },
        };
      });

      before('Create users, roles', () => {
        cy.getAdminToken();

        // Create testUser and all users in Central without Keycloak records
        cy.getUserGroups().then((groupId) => {
          cy.createTempUser([]).then((props) => {
            Object.assign(testUser, props);
            cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
            cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
          });

          ['userA', 'userB', 'userC', 'userD', 'userE'].forEach((key) => {
            userBodies[key].patronGroup = groupId;
            Users.createViaApi(userBodies[key]).then((user) => {
              users[key] = {
                userId: user.id,
                username: userBodies[key].username,
                lastName: userBodies[key].personal.lastName,
              };
              assignedUserIds.push(user.id);
            });
          });
        });

        // Assign College affiliation to Users B-E (not A)
        cy.then(() => {
          ['userB', 'userC', 'userD', 'userE'].forEach((key) => {
            cy.assignAffiliationToUser(Affiliations.College, users[key].userId);
          });
        });

        // Create Central roles
        [testData.centralRoleA, testData.centralRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => centralRoleIds.push(role.id));
        });

        // Switch to College: assign testUser capabilities and create College roles
        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          [testData.collegeRoleA, testData.collegeRoleB].forEach((roleName) => {
            cy.createAuthorizationRoleApi(roleName).then((role) => collegeRoleIds.push(role.id));
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password, {
          path: `${TopMenu.usersPath}/view/${users.userA.userId}`,
          waiter: UsersCard.waitLoading,
        });
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        centralRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        Users.deleteViaApi(testUser.userId);
        assignedUserIds.forEach((id) => Users.deleteViaApi(id));
        cy.setTenant(Affiliations.College);
        collegeRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
      });

      it(
        'C1347148 ECS | Assign authorization roles in Central tenant to a user created in Central tenant, confirming user creation in Keycloak (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C1347148'] },
        () => {
          // Steps 1-5: User A (1 affiliation) — assign Central role; Keycloak modal → Cancel → 0 roles
          UsersCard.verifyUserLastFirstNameInCard(users.userA.lastName);
          UsersCard.verifyAffiliationsQuantity('1');
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
          UserEdit.clickCancelInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('1');
          UsersCard.verifyUserRolesCounter('0');

          // Steps 6-7: User A again — assign Central role; Keycloak modal → Confirm
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
          UsersCard.verifyAffiliationsQuantity('1');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 8-9: User B (2 affiliations) — assign Central role; Keycloak modal → Confirm
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
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userB.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Step 10: User C — assign College (Member) role only; no Keycloak modal
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
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 11-12: User D — assign Central then College; Keycloak modal for Central → Confirm
          cy.visit(`${TopMenu.usersPath}/view/${users.userD.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userD.lastName);
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
          UserEdit.checkPromoteUserModal(users.userD.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 13-14: User E — assign College then Central; Keycloak modal for Central → Confirm
          cy.visit(`${TopMenu.usersPath}/view/${users.userE.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userE.lastName);
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
          UserEdit.checkPromoteUserModal(users.userE.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Step 15: User E again — assign additional College + Central; no Keycloak modal
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleB]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleB]);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA, testData.centralRoleB]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA, testData.collegeRoleB]);
        },
      );
    });
  });
});
