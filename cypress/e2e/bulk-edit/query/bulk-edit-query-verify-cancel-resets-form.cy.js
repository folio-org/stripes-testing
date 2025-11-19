import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames } from '../../../support/constants';

let user;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
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
      'C389572 Verify the Built query form reset to its original state clicking on Cancel (firebird)',
      { tags: ['extendedPath', 'firebird', 'C389572'] },
      () => {
        // Step 1: Select "Users" radio button under "Record types" accordion => Click on the "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyBuildQueryInFullScreenMode();
        QueryModal.verifyRecordTypeLabel('Users');
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();
        QueryModal.testQueryDisabled(true);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.xButttonDisabled(false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);

        // Step 2: Select "User - Active" option => Select "equals" operator => Select "True" value
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.verifySelectedField(usersFieldValues.userActive);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.verifyQueryAreaContent('(users.active == true)');
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 3: Click "+" button in "Actions" column to add new row
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.testQueryDisabled(true);
        QueryModal.runQueryDisabled(true);

        // Step 4: Click "x" icon in the left upper corner of "Build query" form
        QueryModal.clickXButtton();
        QueryModal.verifyClosed();

        // Step 5: Click on the "Build query" button once again
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyEmptyField();
        QueryModal.verifyEmptyOperator();
        QueryModal.verifyEmptyValue();
        QueryModal.verifyQueryAreaContent('');
        QueryModal.verifyRecordTypeLabel('Users');
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.xButttonDisabled(false);

        // Step 6: Select "User - Active" option => Select "equals" operator => Select "True" value
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 7: Click "+" button in "Actions" column to add new row
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.testQueryDisabled(true);
        QueryModal.runQueryDisabled(true);

        // Step 8: Select "User - First name" => Select "not equal to" => Fill in the "Value" field
        QueryModal.selectField(usersFieldValues.firstName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
        QueryModal.fillInValueTextfield(user.firstName, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 9: Click "Cancel" button
        QueryModal.clickCancel();
        QueryModal.verifyClosed();

        // Step 10: Click on the "Build query" button once again
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyEmptyField();
        QueryModal.verifyEmptyOperator();
        QueryModal.verifyEmptyValue();
        QueryModal.verifyQueryAreaContent('');
        QueryModal.verifyRecordTypeLabel('Users');
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.xButttonDisabled(false);

        // Step 11: Click "Select field" dropdown => Select "Patron group - Name" option
        QueryModal.selectField(usersFieldValues.patronGroup);
        QueryModal.verifySelectedField(usersFieldValues.patronGroup);
        QueryModal.verifyQueryAreaContent('(groups.group  )');

        // Step 12: Click "Select operator" dropdown => Select "equals" option
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(groups.group == )');

        // Step 13: Click "Select value" dropdown => Select any patron group (e.g. "staff")
        QueryModal.chooseValueSelect(patronGroupNames.STAFF);
        QueryModal.verifyQueryAreaContent('(groups.group == staff)');
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 14: Click "Test query" button
        QueryModal.clickTestQuery();
        QueryModal.testQueryDisabled(true);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 15: While query is in progress click "Cancel" button
        QueryModal.clickCancel();
        QueryModal.verifyClosed();

        // Step 16: Click on the "Build query" button once again
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyEmptyField();
        QueryModal.verifyEmptyOperator();
        QueryModal.verifyEmptyValue();
        QueryModal.verifyQueryAreaContent('');
        QueryModal.verifyRecordTypeLabel('Users');
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.xButttonDisabled(false);
      },
    );
  });
});
