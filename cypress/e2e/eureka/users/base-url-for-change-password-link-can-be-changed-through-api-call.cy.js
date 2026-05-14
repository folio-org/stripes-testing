import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { including } from '../../../../interactors';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const defaultBaseUrl = Cypress.config().baseUrl;
    const newBaseUrl = `https://at_c1322906_${getRandomPostfix()}.org`;
    const capabSetsToAssign = [
      CapabilitySets.uiUsersView,
      CapabilitySets.uiUsersEdit,
      CapabilitySets.uiUsersResetPassword,
      CapabilitySets.baseUrlManage,
    ];

    let tempUser;
    let userA;

    before('Create users', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssign);
        cy.createTempUser([]).then((createdUserAProperties) => {
          userA = createdUserAProperties;

          cy.login(tempUser.username, tempUser.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
          });
          UsersSearchPane.searchByUsername(userA.username);
          UsersSearchPane.selectUserFromList(userA.username);
          UserEdit.openEdit();
        });
      });
    });

    after('Delete users', () => {
      cy.getAdminToken();
      cy.setFrontEndBaseUrlViaApi(defaultBaseUrl);
      Users.deleteViaApi(tempUser.userId);
      Users.deleteViaApi(userA.userId);
    });

    it(
      'C1322906 Base url for "change password" link can be changed through api call (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1322906'] },
      () => {
        UserEdit.clickResetPasswordLink();
        UserEdit.verifyResetLink(including(`${defaultBaseUrl}/reset-password/`));

        UserEdit.dismissResetLinkModal();

        cy.then(() => {
          cy.setFrontEndBaseUrlViaApi(newBaseUrl).then(({ status }) => {
            expect(status).to.equal(201);
            UserEdit.clickResetPasswordLink();
            UserEdit.verifyResetLink(including(`${newBaseUrl}/reset-password/`));

            UserEdit.dismissResetLinkModal();
          });
        }).then(() => {
          cy.setFrontEndBaseUrlViaApi(defaultBaseUrl).then(({ status }) => {
            expect(status).to.equal(201);
            UserEdit.clickResetPasswordLink();
            UserEdit.verifyResetLink(including(`${defaultBaseUrl}/reset-password/`));
          });
        });
      },
    );
  });
});
