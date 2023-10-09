import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const newName = `testName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = {
  first: `*-Updates-Preview-${userUUIDsFileName}`,
  second: `*-Updates-Preview-${editedFileName}`,
};
const updatedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}`);
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask(
      userUUIDsFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName.first,
      previewOfProposedChangesFileName.second,
      updatedRecordsFileName,
    );
  });

  it(
    'C375214 Verify generated Logs files for Users CSV -- only valid (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.prepareValidBulkEditFile(
        matchedRecordsFileName,
        editedFileName,
        'testPermFirst',
        newName,
      );

      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(editedFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.verifyChangedResults(newName);

      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(userUUIDsFileName, [user.userId]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [user.userId],
        'userId',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName.first,
        [newName],
        'firstName',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [newName],
        'firstName',
        true,
      );

      // Go to users app and verify changes
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyFirstNameOnUserDetailsPane(newName);
    },
  );
});
