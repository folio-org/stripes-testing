import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const { user, memberTenant } = parseSanityParameters();

      const testData = {
        roleName: `AT_C627398_UserRole_${getRandomPostfix()}`,
        filtername: 'Status',
        optionName: 'Active',
        patronGroupPrefix: `AT_C627398_UserGroup_${getRandomLetters(7)}`,
        patronGroups: [],
      };

      before('Create users, roles', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password);
        cy.allure().logCommandSteps();

        cy.then(() => {
          for (let i = 0; i < 3; i++) {
            cy.createUserGroupApi({
              groupName: `${testData.patronGroupPrefix}_${i}`,
              expirationOffsetInDays: 365,
            }).then((patronGroupBody) => {
              testData.patronGroups.push(patronGroupBody);
            });
          }
        })
          .then(() => {
            testData.groupAName = testData.patronGroups[2].group;
            testData.groupBName = testData.patronGroups[0].group;
            testData.groupCName = testData.patronGroups[1].group;
          })
          .then(() => {
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([], testData.groupBName).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createTempUser([], testData.groupCName).then((createdUserCProperties) => {
                  testData.userC = createdUserCProperties;
                  cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
                    testData.roleId = role.id;
                    cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleId]);
                  });
                });
              });
            });
          })
          .then(() => {
            cy.allure().logCommandSteps(false);
            cy.login(user.username, user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
              authRefresh: true,
            });
            cy.allure().logCommandSteps();
          });
      });

      after('Delete roles, users', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password);
        cy.allure().logCommandSteps();
        cy.deleteAuthorizationRoleApi(testData.roleId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        Users.deleteViaApi(testData.userC.userId);
        for (let i = 0; i < testData.patronGroups.length; i++) {
          cy.deleteUserGroupApi(testData.patronGroups[i].id, true);
        }
      });

      it(
        'C627398 [UIROLES-125] Assigning/unassigning users for an existing authorization role while having users.settings Manage (eureka)',
        { tags: ['dryRun', 'eureka', 'C627398'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(1);
          AuthorizationRoles.verifyAssignedUser(
            testData.userA.lastName,
            testData.userA.firstName,
            true,
            testData.groupAName,
          );
          AuthorizationRoles.clickAssignUsersButton();
          cy.wait(3000);
          AuthorizationRoles.selectFilterOptionInAssignModal(
            testData.filtername,
            testData.optionName,
            true,
            true,
          );
          AuthorizationRoles.clickResetAllInAssignModal();
          AuthorizationRoles.selectUserInModal(testData.userA.username, false);
          AuthorizationRoles.selectUserInModal(testData.userB.username);
          AuthorizationRoles.selectUserInModal(testData.userC.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(2);
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBName,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userC.lastName,
            testData.userC.firstName,
            true,
            testData.groupCName,
          );
          AuthorizationRoles.closeRoleDetailView(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(2);
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBName,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userC.lastName,
            testData.userC.firstName,
            true,
            testData.groupCName,
          );
          AuthorizationRoles.clickAssignUsersButton();
          cy.wait(3000);
          AuthorizationRoles.selectUserInModal(testData.userB.username, false);
          AuthorizationRoles.selectUserInModal(testData.userC.username, false);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        },
      );
    });
  });
});
