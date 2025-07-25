import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
const externalId = getRandomPostfix();
const userExternalIDsFileName = `userExternalIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userExternalIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userExternalIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${userExternalIDsFileName}`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userExternalIDsFileName}`, externalId);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userExternalIDsFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          userExternalIDsFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C651579 Verify genetated Logs files for Users In app -- only valid External IDs (firebird)',
        { tags: ['smoke', 'firebird', 'C651579'] },
        () => {
          UsersSearchPane.searchByStatus('Active');
          UsersSearchPane.searchByUsername(user.username);
          UserEdit.addExternalId(externalId);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.waitLoading();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('External IDs');

          BulkEditSearchPane.uploadFile(userExternalIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditForm();
          const newEmailDomain = 'google.com';
          BulkEditActions.replaceEmail('folio.org', newEmailDomain);
          BulkEditActions.confirmChanges();
          BulkEditActions.downloadPreview();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(userExternalIDsFileName, [externalId]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            `*${matchedRecordsFileName}`,
            [user.barcode],
            'userBarcode',
            true,
          );

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            [newEmailDomain],
            'emailDomain',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [newEmailDomain],
            'emailDomain',
            true,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          cy.reload();
          Users.verifyLastNameOnUserDetailsPane(user.username);
          Users.verifyEmailDomainOnUserDetailsPane(newEmailDomain);
        },
      );
    });
  });
});
