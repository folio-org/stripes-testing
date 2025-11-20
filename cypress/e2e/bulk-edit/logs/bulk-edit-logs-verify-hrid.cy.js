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
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // To ensure at least 1 record exists, make a query to get user by id
        cy.login(userForBuildQuery.username, userForBuildQuery.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        cy.wait(5000);
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
        cy.wait(5000);
        BulkEditSearchPane.openLogsSearch();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userForBuildQuery.userId);
    });

    it(
      'C380596 Verify that HRIDs in "Logs" are human readable (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380596'] },
      () => {
        BulkEditLogs.verifyLogsPane();
        cy.intercept('GET', '/bulk-operations?query*').as('getOperations');
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.selectUserFromDropdown(userForBuildQuery.username);
        cy.wait('@getOperations').then((interception) => {
          const targetOperation = interception.response.body.bulkOperations.find(
            (operation) => operation.userId === userForBuildQuery.userId,
          );

          expect(targetOperation.id).to.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
          expect(targetOperation.hrId).to.match(/^\d+$/);

          BulkEditLogs.verifyOperationHrid(
            userForBuildQuery.username,
            String(targetOperation.hrId),
          );
        });
      },
    );
  });
});
