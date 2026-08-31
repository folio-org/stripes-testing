import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const testCaseId = 'C446166';
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
  description: `AT_${testCaseId}_Desc_${getRandomPostfix()}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users', () => {
      before('Create test data and login', () => {
        cy.createTempUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]).then(
          (userProperties) => {
            user = userProperties;
            // Note: tempUser is created without expirationDate by default

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C446166 Column "User expiration date" is blank for users with not populated expiration date (athena)',
        { tags: ['extendedPath', 'athena', 'C446166'] },
        () => {
          // Step 1-2: Create new list with Users record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.users);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "User — User UUID" field
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.verifySelectedField(usersFieldValues.userId);
          QueryModal.verifyOperatorColumn();

          // Step 4: Select "Equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);

          // Step 5: Add User UUID value
          QueryModal.fillInValueTextfield(user.userId);
          QueryModal.verifyTextFieldValue(user.userId);
          QueryModal.verifyQueryAreaContent(`(users.id == ${user.userId})`);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 6: Click "Test Query" button
          QueryModal.clickTestQuery();
          QueryModal.testQueryDisabled(true);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 7: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          // Step 8: Click "Show Columns" and check "User — Expiration date"
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyShowColumnsMenuDisplayed();
          QueryModal.selectCheckboxInShowColumns(usersFieldValues.expirationDate);
          QueryModal.verifyColumnDisplayed(usersFieldValues.expirationDate);

          // Step 9: Verify Expiration Date column is BLANK (not showing current date)
          QueryModal.verifyMatchedRecordsByIdentifier(
            user.barcode,
            usersFieldValues.expirationDate,
            '',
          );
        },
      );
    });
  });
});
