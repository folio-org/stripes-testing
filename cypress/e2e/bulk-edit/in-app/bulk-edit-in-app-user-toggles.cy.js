import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const today = DateTools.getFormattedDate(
  { date: new Date() },
  'YYYY-MM-DD',
);

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
      ], 'staff').then((userProperties) => {
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
      { tags: [testTypes.extendedPath, devTeams.firebird] },
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
          'Failed'
        ];
        statuses.forEach((status) => BulkEditSearchPane.checkLogsStatus(status));

        BulkEditSearchPane.checkHoldingsCheckbox();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.fillLogsStartDate(today, today);
        BulkEditSearchPane.applyStartDateFilters();
        BulkEditSearchPane.fillLogsEndDate(today, today);
        BulkEditSearchPane.applyEndDateFilters();
        BulkEditSearchPane.verifyLogsTableHeaders();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.resetAll();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('staff (Staff Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(userUUIDsFileName, 0, 1);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        statuses.forEach((status) => BulkEditSearchPane.checkLogsStatus(status));
        BulkEditSearchPane.checkHoldingsCheckbox();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.fillLogsStartDate(today, today);
        BulkEditSearchPane.applyStartDateFilters();
        BulkEditSearchPane.fillLogsEndDate(today, today);
        BulkEditSearchPane.applyEndDateFilters();
        BulkEditSearchPane.verifyLogsTableHeaders();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(userUUIDsFileName, 0, 1);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.resetAll();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(userUUIDsFileName, 0, 1);
      },
    );
  });
});
