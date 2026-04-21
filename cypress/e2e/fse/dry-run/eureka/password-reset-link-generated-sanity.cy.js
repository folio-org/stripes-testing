import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { getRandomLetters } from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Users', () => {
    const { user, memberTenant } = parseSanityParameters();

    const testData = {
      resetLinkPath: '/users-keycloak/password-reset/link',
      patronGroupName: `AT_C434077_UserGroup_${getRandomLetters(10)}`,
    };

    before('Create users', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      cy.createUserGroupApi({
        groupName: testData.patronGroupName,
        expirationOffsetInDays: 365,
      }).then((patronGroupBody) => {
        testData.patronGroupId = patronGroupBody.id;

        cy.createTempUser([], testData.patronGroupName).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;

          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps();
        });
      });
    });

    after('Delete users', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      Users.deleteViaApi(testData.userA.userId);
      cy.deleteUserGroupApi(testData.patronGroupId, true);
    });

    it(
      'C434077 Password reset link can be generated when editing user profile (eureka)',
      { tags: ['dryRun', 'eureka', 'C434077'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userA.username);
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UserEdit.openEdit();
        cy.intercept('POST', testData.resetLinkPath).as('resetLinkCall');
        UserEdit.clickResetPasswordLink();
        cy.wait('@resetLinkCall').then((resetLinkCall) => {
          expect(resetLinkCall.response.statusCode).to.eq(200);
          const linkText = resetLinkCall.response.body.link;
          UserEdit.verifyResetLink(linkText);
        });
      },
    );
  });
});
