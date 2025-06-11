import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const futureDate = DateTools.getFutureWeekDateObj();
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(userBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditLogsView.gui,
        ],
        'staff',
      ).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C430215 Verify only changed properties columns appear on "Are you sure?" form and on Confirmation screen - users (firebird)',
      { tags: ['criticalPath', 'firebird', 'C430215'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [user.barcode]);
        BulkEditSearchPane.uncheckShowColumnCheckbox('Email', 'Expiration date', 'Patron group');
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillExpirationDate(futureDate);
        BulkEditActions.addNewBulkEditFilterString();
        const oldEmail = 'test@folio.org';
        const newEmail = 'test@google.com';
        BulkEditActions.replaceEmail(oldEmail, newEmail, 1);
        BulkEditActions.addNewBulkEditFilterString();
        const newPatronGroup = 'faculty';
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)', 2);
        BulkEditActions.deleteRow(1);
        BulkEditActions.deleteRow(0);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude('Email');
        BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude('Expiration date');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Patron group', newPatronGroup);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${newPatronGroup},,,${user.username},testPermFirst,testMiddleName,preferredName,test@folio.org,,,,,002,,,,`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude('Email');
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude('Expiration date');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Patron group', newPatronGroup);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${newPatronGroup},,,${user.username},testPermFirst,testMiddleName,preferredName,test@folio.org,,,,,002,,,,`,
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
      },
    );
  });
});
