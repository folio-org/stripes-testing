import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
        ],
        'staff',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C388541 Verify preview of records switching between toggles (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C388541'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.openLogsSearch();

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

        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.fillLogsStartDate(today, today);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.fillLogsEndDate(today, today);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyLogResultsFound();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.resetAll();
        BulkEditLogs.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('staff (Staff Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyErrorByIdentifier(
          user.userId,
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        statuses.forEach((status) => BulkEditLogs.checkLogsCheckbox(status));
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.fillLogsStartDate(today, today);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.fillLogsEndDate(today, today);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyLogResultsFound();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyErrorByIdentifier(
          user.userId,
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.resetAll();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyErrorByIdentifier(
          user.userId,
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
      },
    );
  });
});
