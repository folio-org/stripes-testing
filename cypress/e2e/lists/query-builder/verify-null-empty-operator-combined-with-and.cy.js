import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451550_List_${getRandomPostfix()}`;
const listDescription = `AT_C451550_Description_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451550 Verify the operator null/empty combined with AND (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451550'] },
      () => {
        // Step 1: Navigate to Lists app and verify initial state
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select first field "User — Mobile phone"
        QueryModal.selectField(usersFieldValues.userMobilePhone);
        QueryModal.verifySelectedField(usersFieldValues.userMobilePhone);
        QueryModal.verifyQueryAreaContent('(users.mobile_phone  )');

        // Step 3: Verify operator dropdown options for "User — Mobile phone" field
        QueryModal.verifyOperatorsList(STRING_OPERATORS);

        // Step 4: Select operator "is null/empty" for first field
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`);
        QueryModal.verifyQueryAreaContent('(users.mobile_phone  is null/empty )');

        // Step 5: Verify value dropdown options
        QueryModal.verifyOptionsInValueSelect(['True', 'False']);

        // Step 6: Select value "True" for first field
        QueryModal.selectValueFromSelect('True');
        QueryModal.verifySelectedValue('True');
        QueryModal.verifyQueryAreaContent('(users.mobile_phone  is null/empty true)');

        // Step 7: Click "+" button to add second query row
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyValueInBooleanColumn('AND', 1);
        QueryModal.runQueryAndSaveDisabled();

        // Step 8: Select second field "User — First name"
        QueryModal.selectField(usersFieldValues.firstName, 1);
        QueryModal.verifySelectedField(usersFieldValues.firstName, 1);
        QueryModal.verifyQueryAreaContent(
          '(users.mobile_phone  is null/empty true) AND (users.first_name  )',
        );
        QueryModal.verifyOperatorsList(STRING_OPERATORS, 1);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryAndSaveDisabled();

        // Step 9: Select operator "is null/empty" for second field
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
        QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`, 1);
        QueryModal.verifyQueryAreaContent(
          '(users.mobile_phone  is null/empty true) AND (users.first_name  is null/empty )',
        );
        QueryModal.verifyOptionsInValueSelect(['True', 'False'], 1);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryAndSaveDisabled();

        // Step 10: Select value "False" for second field
        QueryModal.selectValueFromSelect('False', 1);
        QueryModal.verifySelectedValue('False', 1);
        QueryModal.verifyQueryAreaContent(
          '(users.mobile_phone  is null/empty true) AND (users.first_name  is null/empty false)',
        );
        // Add third query row to filter by precondition user's username
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyValueInBooleanColumn('AND', 2);
        QueryModal.selectField(usersFieldValues.userName, 2);
        QueryModal.verifySelectedField(usersFieldValues.userName, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 2);
        QueryModal.fillInValueTextfield(user.username, 2);
        QueryModal.verifyQueryAreaContent(
          `(users.mobile_phone  is null/empty true) AND (users.first_name  is null/empty false) AND (users.username == ${user.username})`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();

        // Step 11: Click "Test query" button
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        // Step 12: Verify preview shows matched records
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 13: Verify column data - all three query fields displayed as columns with correct data
        QueryModal.verifyColumnDisplayed(usersFieldValues.userMobilePhone);
        QueryModal.verifyColumnDisplayed(usersFieldValues.firstName);
        QueryModal.verifyColumnDisplayed(usersFieldValues.userName);
        QueryModal.verifyMatchedRecordsByIdentifier(
          user.firstName,
          usersFieldValues.userMobilePhone,
          '',
        );
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          user.firstName,
          usersFieldValues.firstName,
          user.firstName,
        );
        QueryModal.verifyMatchedRecordsByIdentifier(
          user.firstName,
          usersFieldValues.userName,
          user.username,
        );

        // Step 14: Click "Run query & save" button
        QueryModal.clickRunQueryAndSave();

        // Step 15: Verify success message and query modal closes
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 16: View updated list and wait for compilation
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();
        Lists.waitForCompilingToComplete();

        // Step 17: Verify saved query and column data in list details
        Lists.getQueryText().then((actualSavedQuery) => {
          expect(actualSavedQuery).to.eq(
            `Query: (users.mobile_phone  is null/empty true) AND (users.first_name  is null/empty false) AND (users.username == ${user.username})`,
          );
        });

        Lists.verifyResultColumnDisplayed(usersFieldValues.userMobilePhone);
        Lists.verifyResultColumnDisplayed(usersFieldValues.firstName);
        Lists.verifyResultColumnDisplayed(usersFieldValues.userName);
        QueryModal.verifyColumnValueForRow(user.firstName, usersFieldValues.userMobilePhone, '');
        QueryModal.verifyColumnValueForRow(
          user.firstName,
          usersFieldValues.firstName,
          user.firstName,
        );
      },
    );
  });
});
