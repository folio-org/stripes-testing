import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const invalidUserUUID = getRandomPostfix();
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
const invalidUserUUIDsFileName = `invalidUserUUIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName =
  BulkEditFiles.getErrorsFromMatchingFileName(invalidUserUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'undergrad',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        FileManager.createFile(`cypress/fixtures/${invalidUserUUIDsFileName}`, invalidUserUUID);
      });
    });

    beforeEach('select User', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      cy.wait(5000);
      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidUserUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        `*${matchedRecordsFileName}`,
        errorsFromMatchingFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357579 Bulk edit: In app - Update user records permission enabled - Preview of records matched (firebird)',
      { tags: ['smoke', 'firebird', 'C357579'] },
      () => {
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.verifyUserBarcodesResultAccordion();

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditForm();
      },
    );

    it(
      'C357987 Verify Users Patron group bulk edit -- in app approach (firebird)',
      { tags: ['smoke', 'firebird', 'C357987'] },
      () => {
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(user.username);
        UsersSearchPane.openUser(user.username);
        UsersCard.verifyPatronBlockValue('graduate');
      },
    );

    it(
      'C359213 Verify elements "Are you sure form?" -- Users-in app approach (firebird)',
      { tags: ['smoke', 'firebird', 'C359213'] },
      () => {
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('staff (Staff Member)');

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, user.username);
        BulkEditActions.clickKeepEditingBtn();

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults('staff');
      },
    );

    it(
      'C359214 Verify expiration date updates in In-app approach (firebird)',
      { tags: ['smoke', 'firebird', 'C359214'] },
      () => {
        const todayDate = new Date();
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillExpirationDate(todayDate);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(user.username);
        UsersSearchPane.openUser(user.username);
        UsersCard.verifyExpirationDate(todayDate);
      },
    );

    it(
      'C359237 Verify "Expiration date" option in the dropdown (firebird)',
      { tags: ['smoke', 'firebird', 'C359237'] },
      () => {
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyCalendarItem();
      },
    );

    it(
      'C359585 Verify clicking on the "Commit changes" button (firebird)',
      { tags: ['smoke', 'firebird', 'C359585'] },
      () => {
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.verifyCheckedDropdownMenuItem();
        BulkEditActions.verifyUncheckedDropdownMenuItem();

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, user.username);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(user.username);
      },
    );

    it(
      'C359211 Verify upload file with invalid identifiers -- " -- Users-in app approach (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C359211'] },
      () => {
        BulkEditSearchPane.uploadFile(invalidUserUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
          'ERROR',
          invalidUserUUID,
          'No match found',
        ]);
      },
    );
  });
});
