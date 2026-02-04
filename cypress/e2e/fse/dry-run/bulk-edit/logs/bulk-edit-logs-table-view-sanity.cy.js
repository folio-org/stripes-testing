import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import DateTools from '../../../../../support/utils/dateTools';
import BulkEditLogs from '../../../../../support/fragments/bulk-edit/bulk-edit-logs';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    it(
      'C368015 Verify that displays a table in the main logs page (firebird)',
      { tags: ['dryRun', 'firebird', 'C368015'] },
      () => {
        const tomorrowDate = DateTools.getFormattedDate(
          { date: DateTools.getTomorrowDay() },
          'YYYY-MM-DD',
        );

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.verifyLogsTableHeaders();
        BulkEditLogs.fillLogsStartDate(tomorrowDate, tomorrowDate);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.noLogResultsFound();
      },
    );
  });
});
