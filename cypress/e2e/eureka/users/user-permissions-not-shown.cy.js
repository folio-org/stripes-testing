import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import TopMenu from '../../../support/fragments/topMenu';

let testData;

describe(
  'Eureka',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Users', () => {
      testData = {
        lastName: `AT_C442842_LastName_${generateItemBarcode()}`,
        userType: 'Patron',
        userEmail: 'AT_C442842@test.com',
        userName: `at_c448284_username_${generateItemBarcode()}`,
      };

      beforeEach(() => {
        cy.getAdminToken();
        cy.getUserGroups({ limit: 1 });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          cy.createUserGroupApi().then((group) => {
            testData.userGroup = group;
          });
          cy.loginAsAdmin({
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
            authRefresh: true,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        cy.getUsers({ query: `personal.lastName="${testData.lastName}"` }).then(() => {
          Cypress.env('users').forEach((user) => {
            Users.deleteViaApi(user.id);
          });
        });
        Users.deleteViaApi(testData.tempUser.userId);
        cy.deleteUserGroupApi(testData.userGroup.id, true);
      });

      it(
        'C442842 "User permissions" accordion is NOT shown when viewing/creating/editing user profile (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C442842'] },
        () => {
          const userGroupOption = testData.userGroup.group + ' (' + testData.userGroup.desc + ')';
          Users.clickNewButton();
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
  },
);
