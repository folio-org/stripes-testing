import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
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
        { tags: ['extendedPath', 'firebird', 'C380770'] },
        () => {
          cy.viewport(2560, 1440);
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkLogsCheckbox('Completed');
          BulkEditLogs.checkLogsCheckbox('Completed with errors');
          BulkEditLogs.verifyLogsTableHeaders();
          BulkEditLogs.verifyDirection('Ended');

          let headers = ['Ended', 'ID', 'Started', 'Ended', '# of records', 'Processed'];
          for (let i = 1; i < headers.length; i++) {
            BulkEditLogs.clickLogHeader(headers[i]);
            BulkEditLogs.verifyNoDirection(headers[i - 1]);
            BulkEditLogs.verifyDirection(headers[i], 'ascending');
            BulkEditLogs.clickLogHeader(headers[i]);
            BulkEditLogs.verifyDirection(headers[i]);
          }

          BulkEditLogs.resetStatuses();
          BulkEditLogs.verifyLogsPane();
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
            BulkEditLogs.checkLogsCheckbox(status);
          });
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.fillLogsStartDate(today, today);
          BulkEditLogs.applyStartDateFilters();
          BulkEditLogs.fillLogsEndDate(today, today);
          BulkEditLogs.applyEndDateFilters();
          BulkEditLogs.verifyDirection('Processed');

          headers = ['Processed', 'Ended', 'ID', 'Started', 'Ended', '# of records'];
          for (let i = 1; i < headers.length; i++) {
            BulkEditLogs.clickLogHeader(headers[i]);
            BulkEditLogs.verifyNoDirection(headers[i - 1]);
            BulkEditLogs.verifyDirection(headers[i], 'ascending');
            BulkEditLogs.clickLogHeader(headers[i]);
            BulkEditLogs.verifyDirection(headers[i]);
          }

          BulkEditLogs.resetAll();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.verifyDirection('Ended');
          cy.reload();
          BulkEditLogs.waitLogsTableLoading();
          BulkEditLogs.verifyDirection('Ended');
          BulkEditLogs.clickLogHeader('# of records');
          BulkEditLogs.verifyDirection('# of records', 'ascending');
          cy.reload();
          BulkEditLogs.waitLogsTableLoading();
          BulkEditLogs.verifyDirection('# of records', 'ascending');
        },
      );
    });
  });
});
