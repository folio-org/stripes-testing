import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${userUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.wait(3000);

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.username);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        `*${matchedRecordsFileName}`,
        changedRecordsFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357982 Verify user records - in app permission - confirmation page (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C357982'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('Usernames');

        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const changedFirstName = `testedNameChanged_${getRandomPostfix()}`;
        BulkEditActions.downloadMatchedResults();
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          'testPermFirst',
          changedFirstName,
        );

        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();

        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangedResults(user.username);
        BulkEditSearchPane.verifyChangedResults(changedFirstName);
        BulkEditSearchPane.verifyPaneTitleFileName(editedFileName);
        BulkEditSearchPane.verifyUserBarcodesResultAccordion();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyUsersActionShowColumns();
        BulkEditActions.verifyActionsDownloadChangedCSV();

        BulkEditActions.downloadChangedCSV();

        cy.loginAsAdmin();
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(changedFirstName);
        UsersSearchPane.openUser(changedFirstName);
      },
    );
  });
});
