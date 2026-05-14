import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Edit user profile', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      // Create User B (the user whose username will collide)
      cy.createTempUser([]).then((userBProperties) => {
        testData.userB = userBProperties;
        // Create User A (the logged-in editor)
        cy.createTempUser([permissions.uiUserEdit.gui]).then((userAProperties) => {
          testData.userA = userAProperties;
          cy.login(testData.userA.username, testData.userA.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
    });

    it(
      "C451602 Username uniqueness checking using whitespaces when editing user's profile (volaris)",
      { tags: ['extendedPath', 'volaris', 'C451602'] },
      () => {
        // Step 1: User A opens details pane of an active user (User A's own record)
        UsersSearchPane.searchByUsername(testData.userA.username);

        // Step 2: Click Actions -> Edit, verify Save & close is disabled, Cancel is enabled
        UserEdit.openEdit();
        UserEdit.verifySaveAndCloseIsDisabled(true);
        UserEdit.verifyCancelIsDisable(false);

        // Step 3: Clear the Username field
        UserEdit.clearUsername();
        UserEdit.verifyUsernameFieldValue('');

        // Step 4: Enter whitespace followed by User B's username
        const leadingWhitespaceUsername = ` ${testData.userB.username}`;
        UserEdit.changeUsername(leadingWhitespaceUsername);
        UserEdit.verifyUsernameFieldValue(leadingWhitespaceUsername);
        UserEdit.verifyUsernameAlreadyExistsError();

        // Step 5: Click Save & close - form stays on Edit page with error
        UserEdit.saveAndCloseStayOnEdit();
        UserEdit.verifyUsernameAlreadyExistsError();

        // Step 6: Enter User B's username with trailing whitespace
        const trailingWhitespaceUsername = `${testData.userB.username} `;
        UserEdit.clearUsername();
        UserEdit.changeUsername(trailingWhitespaceUsername);
        UserEdit.verifyUsernameFieldValue(trailingWhitespaceUsername);
        UserEdit.verifySaveAndCloseIsDisabled(false);

        // Step 7: Click Save & close - form stays on Edit page with error
        UserEdit.saveAndCloseStayOnEdit();
        UserEdit.verifyUsernameAlreadyExistsError();

        // Step 8: Enter User B's username with leading and trailing whitespaces
        const surroundingWhitespaceUsername = ` ${testData.userB.username} `;
        UserEdit.clearUsername();
        UserEdit.changeUsername(surroundingWhitespaceUsername);
        UserEdit.verifyUsernameFieldValue(surroundingWhitespaceUsername);
        UserEdit.verifySaveAndCloseIsDisabled(false);

        // Step 9: Click Save & close - form stays on Edit page with error
        UserEdit.saveAndCloseStayOnEdit();
        UserEdit.verifyUsernameAlreadyExistsError();

        // Step 10: Cancel -> Close without saving
        UserEdit.cancelChanges();
        UsersCard.checkKeyValue('Username', testData.userA.username);
      },
    );
  });
});
