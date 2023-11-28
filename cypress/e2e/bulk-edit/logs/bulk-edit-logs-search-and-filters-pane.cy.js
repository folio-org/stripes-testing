import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Bulk Edit - Logs', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditView.gui,
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

  it('C368033 Filters section: Statuses (firebird)', { tags: ['smoke', 'firebird'] }, () => {
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
  });

  it('C368034 Filters section: Record types (firebird)', { tags: ['smoke', 'firebird'] }, () => {
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
  });
});
