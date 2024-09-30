import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const futureDate = DateTools.getFutureWeekDateObj();
const futureDatewithDashes = DateTools.getFormattedDate({ date: futureDate });
const futureDatewithSlashes = DateTools.getFormattedDateWithSlashes({ date: futureDate });
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${userBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
      'C430212 Verify updated properties columns appear on "Are you sure?" form and on Confirmation screen - users (firebird)',
      { tags: ['criticalPath', 'firebird'] },
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
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Email', newEmail);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Expiration date', futureDatewithSlashes);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Patron group', newPatronGroup);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${newPatronGroup},,,${user.username},testPermFirst,testMiddleName,preferredName,${newEmail},,,,,002,,,${futureDatewithDashes}`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Email', newEmail);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Expiration date', futureDatewithSlashes);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Patron group', newPatronGroup);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${newPatronGroup},,,${user.username},testPermFirst,testMiddleName,preferredName,${newEmail},,,,,002,,,${futureDatewithDashes}`,
        ]);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
        UsersCard.verifyExpirationDate(futureDate);
        UsersCard.openContactInfo();
        UsersCard.verifyEmail(newEmail);
      },
    );
  });
});
