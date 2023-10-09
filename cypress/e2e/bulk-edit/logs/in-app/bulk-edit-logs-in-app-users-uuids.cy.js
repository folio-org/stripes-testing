import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let userWithoutPermissions;
const invalidUserUUID = `invalidUserUUID_${getRandomPostfix()}`;
const invalidAndValidUserUUIDsFileName = `invalidAndValidUserUUIDS_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameInvalidAndValid = `Matched-Records-${invalidAndValidUserUUIDsFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidAndValidUserUUIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${invalidAndValidUserUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${invalidAndValidUserUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${invalidAndValidUserUUIDsFileName}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([], 'faculty').then((userProperties) => {
      userWithoutPermissions = userProperties;
    });
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
      FileManager.createFile(
        `cypress/fixtures/${invalidAndValidUserUUIDsFileName}`,
        `${user.userId}\n${userWithoutPermissions.userId}\n${invalidUserUUID}`,
      );
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidAndValidUserUUIDsFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask(
      invalidAndValidUserUUIDsFileName,
      `*${matchedRecordsFileNameInvalidAndValid}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
      errorsFromCommittingFileName,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375245 Verify genetated Logs files for Users In app -- valid and invalid records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
      BulkEditSearchPane.uploadFile(invalidAndValidUserUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.downloadErrors();

      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.verifyBulkEditForm();
      BulkEditActions.fillPatronGroup('staff (Staff Member)');

      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrors();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(invalidAndValidUserUUIDsFileName, [
        user.userId,
        userWithoutPermissions.userId,
        invalidUserUUID,
      ]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileNameInvalidAndValid}`,
        [user.userId, userWithoutPermissions.userId],
        'userId',
        true,
      );

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidUserUUID],
        'firstElement',
        false,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        ['staff', 'staff'],
        'patronGroup',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        ['staff'],
        'patronGroup',
        true,
      );

      BulkEditSearchPane.downloadFileWithCommitErrors();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromCommittingFileName,
        [user.userId],
        'firstElement',
        false,
      );

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyPatronGroupOnUserDetailsPane('staff');
      UsersSearchPane.searchByUsername(userWithoutPermissions.username);
      Users.verifyPatronGroupOnUserDetailsPane('staff');
    },
  );
});
