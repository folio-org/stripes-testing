import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
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

    it(
      'C368035 Filters section: Started, Ended (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368035'] },
      () => {
        const currentDate = DateTools.getCurrentDateForFiscalYear();
        const yesterday = DateTools.getPreviousDayDateForFiscalYear();
        const tomorrow = DateTools.getDayTomorrowDateForFiscalYear();
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsPane();
        const recordTypes = ['Inventory - holdings', 'Inventory - items', 'Users'];
        recordTypes.forEach((recordType) => BulkEditLogs.checkLogsCheckbox(recordType));
        BulkEditLogs.verifyUserAccordionCollapsed();
        BulkEditLogs.clickLogsStartedAccordion();
        BulkEditLogs.verifyLogsStartedAccordionExistsWithElements();
        BulkEditLogs.clickLogsEndedAccordion();
        BulkEditLogs.verifyLogsEndedAccordionExistsWithElements();
        BulkEditLogs.fillLogsDate('Started', 'From', currentDate);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Started', 'From');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', currentDate);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateFieldWithError('Started', 'To', 'Please enter an end date');
        BulkEditLogs.fillLogsDate('Started', 'To', yesterday);
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'To', yesterday);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Started', 'To');
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateAccordionValidationMessage(
          'Started',
          'Start date is greater than end date',
        );
        BulkEditLogs.clickClearSelectedDateButton('Started', 'From');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.verifyLogsStartedAccordionExistsWithElements();
        BulkEditLogs.fillLogsDate('Started', 'From', yesterday);
        BulkEditLogs.fillLogsDate('Started', 'To', currentDate);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateCellsValues(6, yesterday, currentDate);
        BulkEditLogs.verifyClearSelectedFiltersButton('Started');
        BulkEditLogs.fillLogsDate('Ended', 'To', yesterday);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Ended', 'To');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'To', yesterday);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateFieldWithError('Ended', 'From', 'Please enter a start date');
        BulkEditLogs.fillLogsDate('Ended', 'From', currentDate);
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'From', currentDate);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Ended', 'From');
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateAccordionValidationMessage(
          'Ended',
          'Start date is greater than end date',
        );
        BulkEditLogs.clickClearSelectedDateButton('Ended', 'To');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'To', '');
        BulkEditLogs.verifyLogsStartedAccordionExistsWithElements();
        BulkEditLogs.fillLogsDate('Ended', 'To', tomorrow);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateCellsValues(7, yesterday, tomorrow);
        BulkEditLogs.verifyClearSelectedFiltersButton('Ended');
        BulkEditLogs.fillLogsDate('Ended', 'From', yesterday);
        BulkEditLogs.fillLogsDate('Ended', 'To', tomorrow);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateCellsValues(6, yesterday, currentDate);
        BulkEditLogs.verifyDateCellsValues(7, yesterday, tomorrow);
        BulkEditLogs.clickClearStartedFilter();
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'To', '');
        BulkEditLogs.verifyDateCellsValues(7, yesterday, tomorrow);
        BulkEditLogs.resetAll();
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'To', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'To', '');
        BulkEditLogs.clickLogsStartedAccordion();
        BulkEditLogs.clickLogsEndedAccordion();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsPane();
      },
    );
  });
});
