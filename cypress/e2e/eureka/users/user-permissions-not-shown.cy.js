import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      lastName: `TestC442842User${generateItemBarcode()}`,
      userType: 'Patron',
      userEmail: 'test@folio.org',
      userName: `userc448284${generateItemBarcode()}`,
    };

    before(() => {
      cy.loginAsAdmin();
      cy.getAdminToken();
      cy.getUserGroups({ limit: 1 });
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
      });
    });

    afterEach(() => {
      cy.getUsers({ query: `personal.lastName="${testData.lastName}"` }).then(() => {
        Cypress.env('users').forEach((user) => {
          Users.deleteViaApi(user.id);
        });
      });
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C442842 "User permissions" accordion is NOT shown when viewing/creating/editing user profile (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
      () => {
        const userGroupOption =
          Cypress.env('userGroups')[0].group + ' (' + Cypress.env('userGroups')[0].desc + ')';
        cy.visit('/users/create');
        Users.checkCreateUserPaneOpened();
        UserEdit.fillRequiredFields(
          testData.lastName,
          userGroupOption,
          testData.userEmail,
          testData.userType,
          testData.userName,
        );
        UserEdit.verifyUserPermissionsAccordion(false);
        Users.saveCreatedUser();
        Users.checkCreateUserPaneOpened(false);

        Users.verifyLastNameOnUserDetailsPane(testData.lastName);
        UsersCard.verifyUserPermissionsAccordion(false);

        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyUserPermissionsAccordion(false);
        UserEdit.closeUsingIcon();
        UserEdit.checkUserEditPaneOpened(false);

        UsersSearchPane.searchByKeywords(testData.tempUser.username);
        UsersSearchPane.openUser(testData.tempUser.userId);
        Users.verifyLastNameOnUserDetailsPane(testData.tempUser.lastName);
        UsersCard.verifyUserPermissionsAccordion(false);
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyUserPermissionsAccordion(false);
      },
    );
  });
});
