import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';

let user;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
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
    'C380770 Verify sorting in "Bulk edit logs" table (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      cy.viewport(2560, 1440);
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('Completed');
      BulkEditSearchPane.checkLogsCheckbox('Completed with errors');
      BulkEditSearchPane.verifyLogsTableHeaders();
      BulkEditSearchPane.verifyDirection('Ended');

      let headers = ['Ended', 'ID', 'Started', 'Ended', '# of records', 'Processed'];
      for (let i = 1; i < headers.length; i++) {
        BulkEditSearchPane.clickLogHeader(headers[i]);
        BulkEditSearchPane.verifyNoDirection(headers[i - 1]);
        BulkEditSearchPane.verifyDirection(headers[i], 'ascending');
        BulkEditSearchPane.clickLogHeader(headers[i]);
        BulkEditSearchPane.verifyDirection(headers[i]);
      }

      BulkEditSearchPane.resetStatuses();
      BulkEditSearchPane.verifyLogsPane();
      [
        'New',
        'Retrieving records',
        'Saving records',
        'Data modification',
        'Reviewing changes',
        'Completed',
        'Completed with errors',
        'Failed',
      ].forEach((status) => {
        BulkEditSearchPane.checkLogsCheckbox(status);
      });
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.checkItemsCheckbox();
      BulkEditSearchPane.fillLogsStartDate(today, today);
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.fillLogsEndDate(today, today);
      BulkEditSearchPane.applyEndDateFilters();
      BulkEditSearchPane.verifyDirection('Processed');

      headers = ['Processed', 'Ended', 'ID', 'Started', 'Ended', '# of records'];
      for (let i = 1; i < headers.length; i++) {
        BulkEditSearchPane.clickLogHeader(headers[i]);
        BulkEditSearchPane.verifyNoDirection(headers[i - 1]);
        BulkEditSearchPane.verifyDirection(headers[i], 'ascending');
        BulkEditSearchPane.clickLogHeader(headers[i]);
        BulkEditSearchPane.verifyDirection(headers[i]);
      }

      BulkEditSearchPane.resetAll();
      BulkEditSearchPane.checkItemsCheckbox();
      cy.wait(1000);
      BulkEditSearchPane.verifyDirection('Ended');
      cy.reload();
      BulkEditSearchPane.verifyDirection('Ended');
      BulkEditSearchPane.clickLogHeader('# of records');
      BulkEditSearchPane.verifyDirection('# of records', 'ascending');
      cy.reload();
      BulkEditSearchPane.verifyDirection('# of records', 'ascending');
    },
  );
});
