import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe(
    'csv approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.wait(3000);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          cy.wait(3000);

          FileManager.createFile(
            `cypress/fixtures/${userUUIDsFileName}`,
            `${user.userId}\r\n${invalidUserUUID}`,
          );
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C353956 Verify uploading file with User UUIDs (firebird)',
        { tags: ['smoke', 'firebird', 'C353956'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          const newName = `testName_${getRandomPostfix()}`;
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFileName,
            editedFileName,
            user.username,
            newName,
          );
          BulkEditActions.openStartBulkEditForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();

          BulkEditSearchPane.verifyChangedResults(newName);
        },
      );
    },
  );
});
