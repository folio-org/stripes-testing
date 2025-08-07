import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      resetLinkPath: '/users-keycloak/password-reset/link',
    };

    const capabSetsToAssign = [
      CapabilitySets.uiUsersView,
      CapabilitySets.uiUsersEdit,
      CapabilitySets.uiUsersResetPassword,
    ];
    const capabsToAssign = [
      Capabilities.uiUsersView,
      Capabilities.uiUsersEdit,
      Capabilities.uiUsersResetPassword,
      Capabilities.usersKeycloakPasswordResetLinkGenerate,
    ];

    before('Create users', () => {
      cy.getAdminToken();
      cy.getUserGroups({ limit: 1 });
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.tempUser.userId,
          capabsToAssign,
          capabSetsToAssign,
        );
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
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
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C434077'] },
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
