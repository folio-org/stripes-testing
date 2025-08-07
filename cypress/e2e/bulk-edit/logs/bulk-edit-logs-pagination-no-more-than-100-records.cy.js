import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';

let user;
let userForBuildQuery;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        userForBuildQuery = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // To ensure at least 1 record exists, make a query to get user by id
        cy.login(userForBuildQuery.username, userForBuildQuery.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.userId);
        QueryModal.verifySelectedField(usersFieldValues.userId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(user.userId);
        QueryModal.clickTestQuery();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.matchedAccordionIsAbsent(false);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openLogsSearch();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userForBuildQuery.userId);
    });

    it(
      'C389487 Verify pagination with no more than 100 records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C389487'] },
      () => {
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.clickUserAccordion();
        // Need to filter logs by user to ensure that the number of returned records is less than 50
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.selectUserFromDropdown(userForBuildQuery.username);
        BulkEditLogs.verifyLogsPagination(1);
      },
    );
  });
});
