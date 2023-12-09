import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

let user;
const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchedRecordsFile = `*Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          `${user.userId}\r\n${invalidUserUUID}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFile}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357066 Verify populating preview records changed (Local approach) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditActions.downloadMatchedResults();
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFile,
          editedFileName,
          user.firstName,
          newFirstName,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditActions.cancel();
        BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'First name',
          newFirstName
        );
        BulkEditActions.downloadMatchedRecordsAbsent();
        BulkEditActions.startBulkEditAbsent();

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyFirstNameOnUserDetailsPane(newFirstName);
      },
    );
  });
});
