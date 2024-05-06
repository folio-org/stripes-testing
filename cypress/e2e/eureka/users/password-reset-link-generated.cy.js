import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      resetLinkPath: '/users-keycloak/password-reset/link',
    };

    before('Create users', () => {
      cy.getAdminToken();
      cy.getUserGroups({ limit: 1 });
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
          cy.login(testData.tempUser.username, testData.tempUser.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
          });
        });
      });
    });

    after('Delete users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      Users.deleteViaApi(testData.userA.userId);
    });

    it(
      'C434077 Password reset link can be generated when editing user profile (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
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
