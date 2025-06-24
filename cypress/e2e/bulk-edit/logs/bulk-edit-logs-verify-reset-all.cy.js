import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditView.gui,
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
      'C368037 Verify that after clicking on "Reset all" button, all filters resets (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368037'] },
      () => {
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.resetAllBtnIsDisabled(true);
        BulkEditLogs.verifyLogsStatusesAccordionExistsAndUnchecked();
        BulkEditLogs.verifyLogsRecordTypesAccordionExistsAndUnchecked();
        BulkEditLogs.verifyLogsStartedAccordionCollapsed();
        BulkEditLogs.verifyLogsEndedAccordionCollapsed();
        BulkEditLogs.verifyUserAccordionCollapsed();
        BulkEditLogs.checkLogsCheckbox('Completed');
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyClearSelectedFiltersButton('Statuses');
        BulkEditLogs.verifyCellsValues(2, 'Completed');
        BulkEditLogs.resetAll();
        BulkEditLogs.resetAllBtnIsDisabled(true);
        BulkEditLogs.verifyLogsStatusesAccordionExistsAndUnchecked();
        BulkEditLogs.verifyClearSelectedFiltersButton('Statuses', 'absent');
        BulkEditLogs.verifyLogsTableHeaders('absent');
      },
    );
  });
});
