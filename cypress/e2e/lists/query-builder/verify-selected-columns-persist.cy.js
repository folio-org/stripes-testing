import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C436810_List_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
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
      "C436810 Verify that selections from 'Show columns' are persisted to a new list (corsair)",
      { tags: ['extendedPath', 'corsair', 'C436810'] },
      () => {
        // Step 1: Create new list
        Lists.openNewListPane();

        // Step 2: Add "List name" - "Testing for columns"
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();

        // Step 3: Click on "Select Field" dropdown and select "User — Active"
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.barcode, 1);
        QueryModal.testQuery();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(false);

        const defaultUsersColumns = [
          usersFieldValues.patronGroup,
          usersFieldValues.userActive,
          usersFieldValues.userBarcode,
          usersFieldValues.firstName,
          usersFieldValues.lastName,
        ];

        defaultUsersColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(usersFieldValues.userName);

        // Step 4: Click on "Show columns" dropdown in the "Query Builder" - All default columns are checked
        QueryModal.clickShowColumnsButton();
        QueryModal.verifyCheckedCheckboxesPresentInTheTable();

        // Step 5:  Uncheck "User — Active", "User — Barcode"
        [
          usersFieldValues.userActive,
          usersFieldValues.userBarcode,
          usersFieldValues.userEmail,
          usersFieldValues.userMobilePhone,
        ].forEach((column) => {
          QueryModal.clickCheckboxInShowColumns(column);
        });

        const checkedColumns = [
          usersFieldValues.patronGroup,
          usersFieldValues.firstName,
          usersFieldValues.lastName,
          usersFieldValues.userName,
          usersFieldValues.userEmail,
          usersFieldValues.userMobilePhone,
        ];

        checkedColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        [usersFieldValues.userActive, usersFieldValues.userBarcode].forEach((column) => {
          QueryModal.verifyColumnDisplayed(column, false);
        });

        // Step 6: Click on "Run query & save" button
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();
        Lists.waitForCompilingAnimationToDisappear();

        // Step 7: Click on "View updated list" in the toast message after finishing list compiling process
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();

        checkedColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        // Step 8: Click on "Actions" dropdown at top-right and check the columns
        Lists.openActions();

        checkedColumns.forEach((column) => {
          Lists.verifyCheckboxInShowColumnsChecked(column);
        });
      },
    );
  });
});
