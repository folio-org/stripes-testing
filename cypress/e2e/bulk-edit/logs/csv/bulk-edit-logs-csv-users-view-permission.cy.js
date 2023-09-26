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
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersCard from '../../../../support/fragments/users/usersCard';

let user;
const newName = `testName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;

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
    FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`, changedRecordsFileName);
  });

  it(
    'C380562 Verify generated Logs files for Users CSV are hidden without "Users: Can view user profile" permission (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(user.username);

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.prepareValidBulkEditFile(
        matchedRecordsFileName,
        editedFileName,
        user.firstName,
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

      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
      UsersSearchPane.searchByUsername(user.username);
      UsersSearchPane.openUser(user.username);
      UserEdit.addPermissions([permissions.uiUserEdit.gui]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
      ]);

      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.logActionsIsAbsent();
    },
  );
});
