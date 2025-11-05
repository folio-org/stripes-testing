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
      'C368033 Filters section: Statuses (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368033'] },
      () => {
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsStatusesAccordionExistsAndUnchecked();
        BulkEditLogs.clickLogsStatusesAccordion();
        BulkEditLogs.verifyLogsStatusesAccordionCollapsed();
        BulkEditLogs.clickLogsStatusesAccordion();
        BulkEditLogs.verifyLogsStatusesAccordionExistsAndUnchecked();
        const statuses = [
          'New',
          'Retrieving records',
          'Saving records',
          'Data modification',
          'Reviewing changes',
          'Completed',
          'Completed with errors',
          'Failed',
        ];
        statuses.forEach((status) => BulkEditLogs.checkLogsCheckbox(status));
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyClearSelectedFiltersButton('Statuses');
        BulkEditLogs.clickClearSelectedFiltersButton('Statuses');
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkLogsCheckbox('Completed');
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyClearSelectedFiltersButton('Statuses');
        BulkEditLogs.verifyCellsValues(2, 'Completed');
        BulkEditLogs.resetAll();
      },
    );

    it(
      'C368034 Filters section: Record types (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368034'] },
      () => {
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsRecordTypesAccordionExistsAndUnchecked();
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditLogs.verifyLogsRecordTypesAccordionCollapsed();
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditLogs.verifyLogsRecordTypesAccordionExistsAndUnchecked();
        BulkEditLogs.verifyRecordTypesSortedAlphabetically();
        const recordTypes = ['Inventory - holdings', 'Inventory - items', 'Users'];
        recordTypes.forEach((recordType) => BulkEditLogs.checkLogsCheckbox(recordType));
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyClearSelectedFiltersButton('Record types');
        BulkEditLogs.clickClearSelectedFiltersButton('Record types');
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkLogsCheckbox('Users');
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyClearSelectedFiltersButton('Record types');
        BulkEditLogs.verifyCellsValues(1, 'Users');
        BulkEditLogs.resetAll();
      },
    );
  });
});
