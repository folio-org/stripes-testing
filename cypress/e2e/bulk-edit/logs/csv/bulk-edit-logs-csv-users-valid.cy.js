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
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const importFileName = `bulkEditImport_${getRandomPostfix()}.csv`;
const updatedRecordsFileName = 'result';
const newName = `testName_${getRandomPostfix()}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUsersView.gui,
    ])
      .then(userProperties => {
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
    FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  afterEach('reload bulk page', () => {
    cy.visit(TopMenu.bulkEditPath);
  });

  it('C375214 Verify generated Logs files for Users CSV -- only valid (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    // Upload file with user UUIDs
    BulkEditSearchPane.verifyDragNDropUsersUIIDsArea();
    BulkEditSearchPane.uploadFile(userUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    // Download matched results and modify them
    BulkEditActions.downloadMatchedResults();
    BulkEditActions.prepareValidBulkEditFile(matchRecordsFileName, importFileName, 'testPermFirst', newName);

    // Upload modified file and commit changes
    BulkEditActions.openStartBulkEditForm();
    BulkEditSearchPane.uploadFile(importFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.clickNext();
    BulkEditActions.commitChanges();

    // Go to logs pane and verify elements
    BulkEditSearchPane.verifyChangedResults(newName);
    BulkEditActions.openActions();
    BulkEditActions.downloadChangedCSV();
    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.clickActionsRunBy(user.username);
    BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

    // Download File that was used to trigger the bulk edit and compare with original file with UUIDs from line 34
    BulkEditSearchPane.downloadFileUsedToTrigger();
    BulkEditFiles.verifyMatchedResultFileContent(`*${userUUIDsFileName}*`, [user.userId], 'userId', true);

    // Download File with the matching records and verify unique user UUID is in the file
    BulkEditSearchPane.downloadFileWithMatchingRecords();
    BulkEditFiles.verifyMatchedResultFileContent(`*${matchRecordsFileName}*`, [user.userId], 'userId', true);

    // Download File with the preview of proposed changes and verify changes to the user's first name made in line 53
    BulkEditSearchPane.downloadFileWithProposedChanges();
    BulkEditFiles.verifyMatchedResultFileContent(`*${importFileName}*`, [newName], 'firstName', true);

    // Download File with the updated records and verify user's first name is updated
    BulkEditSearchPane.downloadFileWithUpdatedRecords();
    BulkEditFiles.verifyMatchedResultFileContent(`*${updatedRecordsFileName}*`, [newName], 'firstName', true);

    // Go to users app and verify changes
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByUsername(user.username);
    Users.verifyFirstNameOnUserDetailsPane(newName);
  });
});
