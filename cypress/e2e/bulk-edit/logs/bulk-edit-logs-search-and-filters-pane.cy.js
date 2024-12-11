import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;

describe('bulk-edit', () => {
  describe('logs', () => {
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
      { tags: ['extendedPath', 'firebird'] },
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
      { tags: ['extendedPath', 'firebird'] },
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
      { tags: ['extendedPath', 'firebird'] },
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
        BulkEditLogs.fillLogsDate('Started', 'From', currentDate);
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

    it(
      'C368037 Verify that after clicking on "Reset all" button, all filters resets (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
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

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C368033 Filters section: Statuses (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.verifyLogsStatusesAccordionExistsAndUnchecked();
      BulkEditSearchPane.clickLogsStatusesAccordion();
      BulkEditSearchPane.verifyLogsStatusesAccordionCollapsed();
      BulkEditSearchPane.clickLogsStatusesAccordion();
      BulkEditSearchPane.verifyLogsStatusesAccordionExistsAndUnchecked();
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
      statuses.forEach((status) => BulkEditSearchPane.checkLogsCheckbox(status));
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Statuses');
      BulkEditSearchPane.clickClearSelectedFiltersButton('Statuses');
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('Completed');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Statuses');
      BulkEditSearchPane.verifyCellsValues(2, 'Completed');
      BulkEditSearchPane.resetAll();
    },
  );

  it(
    'C368034 Filters section: Record types (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.verifyLogsRecordTypesAccordionExistsAndUnchecked();
      BulkEditSearchPane.clickRecordTypesAccordion();
      BulkEditSearchPane.verifyLogsRecordTypesAccordionCollapsed();
      BulkEditSearchPane.clickRecordTypesAccordion();
      BulkEditSearchPane.verifyLogsRecordTypesAccordionExistsAndUnchecked();
      BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();
      const recordTypes = ['Inventory - holdings', 'Inventory - items', 'Users'];
      recordTypes.forEach((recordType) => BulkEditSearchPane.checkLogsCheckbox(recordType));
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Record types');
      BulkEditSearchPane.clickClearSelectedFiltersButton('Record types');
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('Users');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Record types');
      BulkEditSearchPane.verifyCellsValues(1, 'Users');
      BulkEditSearchPane.resetAll();
    },
  );

  it(
    'C368035 Filters section: Started, Ended (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      const currentDate = DateTools.getCurrentDateForFiscalYear();
      const yesterday = DateTools.getPreviousDayDateForFiscalYear();
      const tomorrow = DateTools.getDayTomorrowDateForFiscalYear();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.verifyLogsPane();
      const recordTypes = ['Inventory - holdings', 'Inventory - items', 'Users'];
      recordTypes.forEach((recordType) => BulkEditSearchPane.checkLogsCheckbox(recordType));
      BulkEditSearchPane.verifyUserAccordionCollapsed();
      BulkEditSearchPane.clickLogsStartedAccordion();
      BulkEditSearchPane.verifyLogsStartedAccordionExistsWithElements();
      BulkEditSearchPane.clickLogsEndedAccordion();
      BulkEditSearchPane.verifyLogsEndedAccordionExistsWithElements();
      BulkEditSearchPane.fillLogsDate('Started', 'From', currentDate);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Started', 'From');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'From', currentDate);
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.verifyDateFieldWithError('Started', 'To', 'Please enter an end date');
      BulkEditSearchPane.fillLogsDate('Started', 'To', yesterday);
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'To', yesterday);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Started', 'To');
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.verifyDateAccordionValidationMessage(
        'Started',
        'Start date is greater than end date',
      );
      BulkEditSearchPane.clickClearSelectedDateButton('Started', 'From');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'From', '');
      BulkEditSearchPane.verifyLogsStartedAccordionExistsWithElements();
      BulkEditSearchPane.fillLogsDate('Started', 'From', yesterday);
      BulkEditSearchPane.fillLogsDate('Started', 'To', currentDate);
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(6, yesterday, currentDate);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Started');
      BulkEditSearchPane.fillLogsDate('Ended', 'To', yesterday);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Ended', 'To');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'To', yesterday);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateFieldWithError('Ended', 'From', 'Please enter a start date');
      BulkEditSearchPane.fillLogsDate('Ended', 'From', currentDate);
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'From', currentDate);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Ended', 'From');
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateAccordionValidationMessage(
        'Ended',
        'Start date is greater than end date',
      );
      BulkEditSearchPane.clickClearSelectedDateButton('Ended', 'To');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'To', '');
      BulkEditSearchPane.verifyLogsStartedAccordionExistsWithElements();
      BulkEditSearchPane.fillLogsDate('Ended', 'To', tomorrow);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, tomorrow);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Ended');
      BulkEditSearchPane.fillLogsDate('Ended', 'From', yesterday);
      BulkEditSearchPane.fillLogsDate('Ended', 'To', tomorrow);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(6, yesterday, currentDate);
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, tomorrow);
      BulkEditSearchPane.clickClearStartedFilter();
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'From', '');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'To', '');
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, tomorrow);
      BulkEditSearchPane.resetAll();
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'From', '');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'To', '');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'From', '');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'To', '');
      BulkEditSearchPane.clickLogsStartedAccordion();
      BulkEditSearchPane.clickLogsEndedAccordion();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.verifyLogsPane();
    },
  );

  it(
    'C368037 Verify that after clicking on "Reset all" button, all filters resets (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.resetAllBtnIsDisabled(true);
      BulkEditSearchPane.verifyLogsStatusesAccordionExistsAndUnchecked();
      BulkEditSearchPane.verifyLogsRecordTypesAccordionExistsAndUnchecked();
      BulkEditSearchPane.verifyLogsStartedAccordionCollapsed();
      BulkEditSearchPane.verifyLogsEndedAccordionCollapsed();
      BulkEditSearchPane.verifyUserAccordionCollapsed();
      BulkEditSearchPane.checkLogsCheckbox('Completed');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Statuses');
      BulkEditSearchPane.verifyCellsValues(2, 'Completed');
      BulkEditSearchPane.resetAll();
      BulkEditSearchPane.resetAllBtnIsDisabled(true);
      BulkEditSearchPane.verifyLogsStatusesAccordionExistsAndUnchecked();
      BulkEditSearchPane.verifyClearSelectedFiltersButton('Statuses', 'absent');
      BulkEditSearchPane.verifyLogsTableHeaders('absent');
    },
  );
});
