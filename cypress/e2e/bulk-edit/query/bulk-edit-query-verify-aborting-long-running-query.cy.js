import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
  booleanOperators,
} from '../../../support/fragments/bulk-edit/query-modal';

let user;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C389573 Query builder - Verify Aborting long running query (firebird)',
      { tags: ['extendedPath', 'firebird', 'C389573'] },
      () => {
        // Step 1: Select "Users" radio button under "Record types" accordion => Click "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        // Step 2: Click "Select field" dropdown in "Field" column => Select "User - Active" option
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.verifySelectedField(usersFieldValues.userActive);
        QueryModal.verifyQueryAreaContent('(users.active  )');

        // Step 3: Click "Select operator" dropdown in "Operator" column
        QueryModal.verifyOperatorsList(booleanOperators);

        // Step 4: Select "equals" option in "Select operator" dropdown
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(users.active == )');

        // Step 5: Click "Select value" dropdown in "Value" column
        QueryModal.verifyOptionsInValueSelect(['True', 'False']);

        // Step 6: Select "True" in "Select value" dropdown
        QueryModal.chooseValueSelect('True');
        QueryModal.verifyQueryAreaContent('(users.active == True)');
        QueryModal.testQueryDisabled(false);

        // Step 7: Click "Test query" button
        QueryModal.clickTestQuery();
        QueryModal.testQueryDisabled(true);

        // Step 8: While query is running click on the "User active" option in "Field" column => Change it to another option
        QueryModal.selectField(usersFieldValues.firstName);
        QueryModal.verifySelectedField(usersFieldValues.firstName);
        QueryModal.verifyQueryAreaContent('(users.first_name  )');
        QueryModal.verifyResultsTableAbsent();
        QueryModal.verifyHeadlineQueryWouldReturnAbsent();
        QueryModal.testQueryDisabled(true);
      },
    );
  });
});
