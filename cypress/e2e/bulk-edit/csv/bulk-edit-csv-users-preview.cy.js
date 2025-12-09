import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
let newFirstName;
let userUUIDsFileName;
let invalidUserUUID;
let matchedRecordsFile;
let editedFileName;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Csv approach', () => {
      beforeEach('create test data', () => {
        newFirstName = `testNewFirstName_${getRandomPostfix()}`;
        userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
        invalidUserUUID = getRandomPostfix();
        matchedRecordsFile = `*Matched-Records-${userUUIDsFileName}`;
        editedFileName = `edited-records-${getRandomPostfix()}.csv`;

        cy.createTempUser([permissions.bulkEditCsvEdit.gui, permissions.uiUserEdit.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            FileManager.createFile(
              `cypress/fixtures/${userUUIDsFileName}`,
              `${user.userId}\r\n${invalidUserUUID}`,
            );
          },
        );
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFile}`);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C357066 Verify populating preview records changed (Local approach) (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C357066'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyMatchedResults(user.username);
          BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

          BulkEditActions.downloadMatchedResults();
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFile,
            editedFileName,
            user.firstName,
            newFirstName,
          );
          BulkEditActions.openStartBulkEditLocalForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          cy.wait(500);
          BulkEditActions.cancel();
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyMatchedResults(user.username);
          BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditLocalForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyChangesUnderColumns('First name', newFirstName);
          BulkEditActions.downloadMatchedRecordsAbsent();
          BulkEditActions.startBulkEditAbsent();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(user.username);
          Users.verifyFirstNameOnUserDetailsPane(newFirstName);
        },
      );
    });
  },
);
