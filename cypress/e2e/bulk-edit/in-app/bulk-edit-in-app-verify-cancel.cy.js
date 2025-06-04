import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import DateTools from '../../../support/utils/dateTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../support/fragments/users/usersCard';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const invalidUsername = getRandomPostfix();
const usernamesFileName = `'valid_and_invalid_users_uuids-${getRandomPostfix()}.csv`;
const nextThreeMonthsDate = DateTools.getAfterThreeMonthsDateObj();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser(
        [
          Permissions.bulkEditLogsView.gui,
          Permissions.bulkEditUpdateRecords.gui,
          Permissions.uiUserEdit.gui,
        ],
        'staff',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${usernamesFileName}`,
          `${user.username}\r\n${invalidUsername}`,
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${usernamesFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C397355 Verify CANCEL during Bulk edit Users In app  (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C397355'] },
      () => {
        // Select the "Users" radio button on  the "Record types" accordion
        BulkEditSearchPane.checkUsersRadio();
        // Select  "Usernames" option from the "Record identifier" dropdown
        BulkEditSearchPane.selectRecordIdentifier('Usernames');
        // Upload a .csv file  with both valid and invalid users' Usernames by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(usernamesFileName);
        BulkEditSearchPane.checkForUploading(usernamesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUsername);
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');
        BulkEditSearchPane.verifyMatchedResults(user.username);

        // Click "Actions" menu
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        // Select the "Start bulk edit" element
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyBulkEditForm();

        BulkEditActions.selectOption('Patron group');
        // Click "Select Option" dropdown => Select "Patron group" option
        BulkEditActions.fillPatronGroup('staff (Staff Member)');

        // Сlick "Confirm changes" option
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, user.username);
        BulkEditActions.clickX();
        BulkEditActions.verifyBulkEditForm();
        BulkEditActions.closeBulkEditInAppForm();
        cy.reload();

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyBulkEditForm();

        BulkEditActions.selectOption('Email');
        BulkEditActions.replaceWithIsDisabled();
        const oldEmailDomain = 'test@folio.org';
        const newEmailDomain = 'test@example.org)';
        BulkEditActions.replaceEmail(oldEmailDomain, newEmailDomain);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        BulkEditActions.confirmChanges();
        // Click "Keep editing" button on  the "Are you sure?" form
        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.verifyBulkEditForm();
        BulkEditActions.closeBulkEditInAppForm();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        // TODO enable line below when this issue is fixed https://issues.folio.org/browse/MODBULKOPS-114
        // BulkEditActions.downloadErrorsExists();

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        // Click "Actions" menu
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyBulkEditForm();
        BulkEditActions.selectOption('Expiration date');

        // // Click on the date picker plugin => Select a date in the future differ from the current expiration date (for example, <current expiration date + 3 months>)
        BulkEditActions.fillExpirationDate(nextThreeMonthsDate);
        BulkEditActions.verifyPickedDate(nextThreeMonthsDate);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        // // Navigate to the "Users" app => Find and open updated user record=> Make sure that changes were applied
        TopMenuNavigation.navigateToApp('Users');
        UsersSearchPane.searchByUsername(user.username);
        UsersCard.verifyExpirationDate(nextThreeMonthsDate);
      },
    );
  });
});
