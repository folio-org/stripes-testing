import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import DateTools from '../../../support/utils/dateTools';

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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C368015 Verify that displays a table in the main logs page (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      const tomorrowDate = DateTools.getFormattedDate(
        { date: DateTools.getTomorrowDay() },
        'YYYY-MM-DD',
      );

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.checkItemsCheckbox();
      BulkEditSearchPane.verifyLogsTableHeaders();
      BulkEditSearchPane.fillLogsStartDate(tomorrowDate, tomorrowDate);
      BulkEditSearchPane.applyStartDateFilters();
      BulkEditSearchPane.noLogResultsFound();
    },
  );
});
