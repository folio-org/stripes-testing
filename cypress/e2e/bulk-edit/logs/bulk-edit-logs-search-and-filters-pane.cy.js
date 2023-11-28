import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
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

  after('delete test data', () => {
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
    statuses.forEach((status) => BulkEditSearchPane.checkLogsStatus(status));
    BulkEditSearchPane.resetAllBtnIsDisabled(false);
    BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Statuses');
    BulkEditSearchPane.clickClearSelectedFiltersButton('Statuses');
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkLogsStatus('New');
    BulkEditSearchPane.resetAllBtnIsDisabled(false);
    BulkEditSearchPane.verifyClearSelectedFiltersButtonExists('Statuses');
    BulkEditSearchPane.verifyCellsValues(2, 'New');
  });
});
