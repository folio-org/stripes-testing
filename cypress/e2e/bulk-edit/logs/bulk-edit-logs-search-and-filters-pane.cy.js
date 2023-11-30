import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';

let user;

describe('Bulk Edit - Logs', () => {
  beforeEach('create test data', () => {
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

  afterEach('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C368033 Filters section: Statuses (firebird) (TaaS)',
    { tags: ['extended', 'firebird'] },
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
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Statuses');
      BulkEditSearchPane.clickClearSelectedFiltersButton('Statuses');
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('New');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Statuses');
      BulkEditSearchPane.verifyCellsValues(2, 'New');
    },
  );

  it(
    'C368034 Filters section: Record types (firebird) (TaaS)',
    { tags: ['smoke', 'firebird'] },
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
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Record types');
      BulkEditSearchPane.clickClearSelectedFiltersButton('Record types');
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('Users');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Record types');
      BulkEditSearchPane.verifyCellsValues(1, 'Users');
    },
  );

  it(
    'C368035 Filters section: Started, Ended (firebird) (TaaS)',
    { tags: ['extended', 'firebird'] },
    () => {
      const currentDate = DateTools.getCurrentDateForFiscalYear();
      const yesterday = DateTools.getPreviousDayDateForFiscalYear();
      const dayBeforeYesterday = DateTools.getTwoPreviousDaysDateForFiscalYear();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneExists();
      BulkEditSearchPane.verifyLogsPane();
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
      BulkEditSearchPane.fillLogsDate('Started', 'From', dayBeforeYesterday);
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(6, dayBeforeYesterday, yesterday);
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Started');
      BulkEditSearchPane.fillLogsDate('Ended', 'To', dayBeforeYesterday);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Ended', 'To');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'To', dayBeforeYesterday);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateFieldWithError('Ended', 'From', 'Please enter a start date');
      BulkEditSearchPane.fillLogsDate('Ended', 'From', yesterday);
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'From', yesterday);
      BulkEditSearchPane.verifyClearSelectedDateButtonExists('Ended', 'From');
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateAccordionValidationMessage(
        'Ended',
        'Start date is greater than end date',
      );
      BulkEditSearchPane.clickClearSelectedDateButton('Ended', 'To');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Ended', 'To', '');
      BulkEditSearchPane.verifyLogsStartedAccordionExistsWithElements();
      BulkEditSearchPane.fillLogsDate('Ended', 'To', currentDate);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, currentDate);
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Ended');
      BulkEditSearchPane.fillLogsDate('Ended', 'From', yesterday);
      BulkEditSearchPane.fillLogsDate('Ended', 'To', yesterday);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDateCellsValues(6, dayBeforeYesterday, yesterday);
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, yesterday);
      BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Ended');
      BulkEditSearchPane.clickClearSelectedFiltersButton('Started');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'From', '');
      BulkEditSearchPane.verifyLogsDateFiledIsEqual('Started', 'To', '');
      BulkEditSearchPane.verifyDateCellsValues(7, yesterday, yesterday);
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
});
