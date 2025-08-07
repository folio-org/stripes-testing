import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {
    user: {},
    testUser: {},
    newMiddleName: getTestEntityValue('newMiddleName'),
    newPhone: '9876543210',
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser().then((userProperties) => {
      testData.testUser = userProperties;
    });
    cy.createTempUser([Permissions.uiUserEdit.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.testUser.userId);
  });

  it(
    'C350611 User filters persist after a record is edited (volaris)',
    { tags: ['extendedPath', 'volaris', 'C350611'] },
    () => {
      // Step 1: Perform a search to retrieve some user records
      UsersSearchPane.searchByUsername(testData.testUser.username);
      UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
      UsersSearchResultsPane.verifyResultsListHasUserWithName(testData.testUser.username);

      // Step 2: Click on any found user record
      UsersSearchPane.selectUserFromList(testData.testUser.username);
      Users.verifyUserDetailsPane();

      // Step 3: Click "Actions" -> "Edit" on user details pane, edit any field, and save
      UserEdit.openEdit();
      UserEdit.changeMiddleName(testData.newMiddleName);
      UserEdit.saveAndClose();
      Users.verifyMiddleNameOnUserDetailsPane(testData.newMiddleName);

      // Verify search results are still the same
      UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
      UsersSearchResultsPane.verifyResultsListHasUserWithName(testData.testUser.username);

      // Step 4: Click "Reset all" and apply any filters to retrieve some user records
      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifySearchPaneIsEmpty(true);
      UsersSearchPane.searchByUsername(testData.testUser.username);
      UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
      UsersSearchResultsPane.verifyResultsListHasUserWithName(testData.testUser.username);

      // Step 5: Click on any found user record
      UsersSearchPane.selectUserFromList(testData.testUser.username);
      Users.verifyUserDetailsPane();

      // Step 6: Click "Actions" -> "Edit" on user details pane, edit any field, and save
      UserEdit.openEdit();
      UserEdit.changePhone(testData.newPhone);
      UserEdit.saveAndClose();

      // Verify search results are still the same
      UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
      UsersSearchResultsPane.verifyResultsListHasUserWithName(testData.testUser.username);
    },
  );
});
