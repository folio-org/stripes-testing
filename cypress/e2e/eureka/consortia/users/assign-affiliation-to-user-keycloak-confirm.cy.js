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
      const testUser = {};
      const users = {};
      const centralUserIds = [];
      const collegeUserIds = [];

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

      const userBodies = {};
      ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
        userBodies[`user${letter}`] = {
          type: 'staff',
          active: true,
          username: `at_c1347146_user${letter.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1347146_LastName_${letter}_${randomPostfix}`,
            firstName: `AT_C1347146_FirstName_${letter}_${randomPostfix}`,
            middleName: `AT_C1347146_MiddleName_${letter}_${randomPostfix}`,
            email: 'at_c1347146@test.com',
            preferredContactTypeIds: ['002'],
          },
        };
      });

      before('Create users', () => {
        cy.getAdminToken();

        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
          cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        });

        cy.getUserGroups().then((groupId) => {
          ['userA', 'userB', 'userC'].forEach((key) => {
            userBodies[key].patronGroup = groupId;
            Users.createViaApi(userBodies[key]).then((user) => {
              users[key] = {
                userId: user.id,
                lastName: userBodies[key].personal.lastName,
                firstName: userBodies[key].personal.firstName,
                middleName: userBodies[key].personal.middleName,
              };
              centralUserIds.push(user.id);
            });
          });
        });

        cy.then(() => {
          cy.assignAffiliationToUser(Affiliations.College, users.userC.userId);
        });

        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          cy.getUserGroups().then((groupId) => {
            ['userD', 'userE'].forEach((key) => {
              userBodies[key].patronGroup = groupId;
              Users.createViaApi(userBodies[key]).then((user) => {
                users[key] = {
                  userId: user.id,
                  lastName: userBodies[key].personal.lastName,
                  firstName: userBodies[key].personal.firstName,
                  middleName: userBodies[key].personal.middleName,
                };
                collegeUserIds.push(user.id);
              });
            });
          });
        });

        cy.then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        cy.visit(`${TopMenu.usersPath}/view/${users.userA.userId}`);
        UsersCard.waitLoading();
      });

      after('Delete users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
        centralUserIds.forEach((id) => Users.deleteViaApi(id));
        cy.setTenant(Affiliations.College);
        collegeUserIds.forEach((id) => Users.deleteViaApi(id));
      });

      it(
        'C1347146 ECS | Assign affiliation to a user in Central and Member tenants, confirming user creation in Keycloak (thunderjet)',
        { tags: ['criticalPathECS', 'eureka', 'thunderjet', 'C1347146'] },
        () => {
          // Step 1: Verify User A initial state (1 affiliation)
          UsersCard.verifyUserLastFirstNameInCard(users.userA.lastName, users.userA.firstName);
          UsersCard.verifyAffiliationsQuantity('1');

          // Steps 2-3: Expand affiliations accordion, open modal, check Member-1
          UsersCard.expandAffiliationsAccordion();
          UsersCard.openAffiliationsModal();
          UsersCard.verifyAffiliationModalDefaultState();
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.college, {
            isShown: true,
            isChecked: false,
          });
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.university, {
            isShown: true,
            isChecked: false,
          });
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.central, {
            isShown: false,
          });
          UsersCard.toggleTenantCheckboxInModal(tenantNames.college, { isChecked: true });
          UsersCard.verifyTotalSelectedInAffiliationsModal(1);

          // Step 4: Check Unassigned checkbox
          UsersCard.selectFilterOptionsInAffiliationsModal({ unassigned: true });
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.college, {
            isShown: false,
          });
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.university, {
            isShown: true,
            isChecked: false,
          });
          UsersCard.verifyTenantInAffiliationsModal(tenantNames.central, {
            isShown: false,
          });

          // Step 5: Save & close → Keycloak modal for Member-1
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userA.lastName,
            `${users.userA.firstName} ${users.userA.middleName}`,
          );

          // Step 6: Cancel → User A affiliations unchanged (1)
          UserEdit.clickCancelInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(tenantNames.central, 1, tenantNames.central);

          // Step 7: Assign Member-1, confirm Keycloak → 2 affiliations
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.college);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userA.lastName,
            `${users.userA.firstName} ${users.userA.middleName}`,
          );
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.central,
            2,
            tenantNames.college,
            tenantNames.central,
          );

          // Step 8: Swap Member-1 → Member-2, Keycloak modal for Member-2
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.college, { isChecked: false });
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userA.lastName,
            `${users.userA.firstName} ${users.userA.middleName}`,
          );

          // Step 9: Confirm → 2 affiliations (Central + Member-2)
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.central,
            2,
            tenantNames.university,
            tenantNames.central,
          );

          // Step 10: Assign Member-1 again → no Keycloak modal → 3 affiliations
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.college);
          UsersCard.saveAndCloseAffiliationsModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.central,
            3,
            tenantNames.college,
            tenantNames.university,
            tenantNames.central,
          );

          // Steps 11-12: User B — assign Member-1 + Member-2, confirm → 3 affiliations
          cy.visit(`${TopMenu.usersPath}/view/${users.userB.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userB.lastName, users.userB.firstName);
          UsersCard.expandAffiliationsAccordion();
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.college);
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userB.lastName,
            `${users.userB.firstName} ${users.userB.middleName}`,
          );
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.central,
            3,
            tenantNames.college,
            tenantNames.university,
            tenantNames.central,
          );

          // Steps 13-14: User C — assign Member-2, confirm → 3 affiliations
          cy.visit(`${TopMenu.usersPath}/view/${users.userC.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userC.lastName, users.userC.firstName);
          UsersCard.expandAffiliationsAccordion();
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userC.lastName,
            `${users.userC.firstName} ${users.userC.middleName}`,
          );
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.central,
            3,
            tenantNames.university,
            tenantNames.college,
            tenantNames.central,
          );

          // Steps 15-16: User D — assign Member-2, confirm → 3 affiliations
          cy.visit(`${TopMenu.usersPath}/view/${users.userD.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userD.lastName, users.userD.firstName);
          UsersCard.expandAffiliationsAccordion();
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(users.userD.lastName, users.userD.firstName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.college,
            3,
            tenantNames.university,
            tenantNames.college,
            tenantNames.central,
          );

          // Step 17: Switch to Member-1, navigate to User E, assign Member-2
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();
          cy.visit(`${TopMenu.usersPath}/view/${users.userE.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userE.lastName, users.userE.firstName);
          UsersCard.expandAffiliationsAccordion();
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UserEdit.checkPromoteUserModal(
            users.userE.lastName,
            `${users.userE.firstName} ${users.userE.middleName}`,
          );

          // Step 18: Confirm → 3 affiliations
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.college,
            3,
            tenantNames.university,
            tenantNames.college,
            tenantNames.central,
          );

          // Step 19: Unassign Member-2 → 2 affiliations
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university, { isChecked: false });
          UsersCard.saveAndCloseAffiliationsModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.college,
            2,
            tenantNames.college,
            tenantNames.central,
          );

          // Step 20: Reassign Member-2 → no Keycloak modal → 3 affiliations
          UsersCard.openAffiliationsModal();
          UsersCard.toggleTenantCheckboxInModal(tenantNames.university);
          UsersCard.saveAndCloseAffiliationsModal();
          UsersCard.verifyAffiliationChangeSuccessCallout();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsDetails(
            tenantNames.college,
            3,
            tenantNames.university,
            tenantNames.college,
            tenantNames.central,
          );
        },
      );
    });
  });
});
