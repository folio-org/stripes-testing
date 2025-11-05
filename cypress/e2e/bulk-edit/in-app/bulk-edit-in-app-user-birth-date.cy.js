import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const birthdate = '1970-12-02';
const birthdateSlashFormat = '12/2/1970';
const dateEnrolled = '2020-01-15';
const dateEnrolledSlashFormat = '1/15/2020';
const expirationDate = '2025-06-30';
const expirationDateSlashFormat = '6/30/2025';
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(userBarcodesFileName, true);
const expectedDateFields = [
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BIRTH_DATE,
    value: birthdateSlashFormat,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.DATE_ENROLLED,
    value: dateEnrolledSlashFormat,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
    value: expirationDateSlashFormat,
  },
];
const expectedDateFieldsInFile = [
  {
    header: 'Date of birth',
    value: birthdate,
  },
  {
    header: 'Enrollment date',
    value: dateEnrolled,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
    value: expirationDate,
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'staff',
      ).then((userProperties) => {
        user = userProperties;
        cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
          cy.updateUser({
            ...users[0],
            personal: { ...users[0].personal, dateOfBirth: birthdate },
            enrollmentDate: dateEnrolled,
            expirationDate,
          });

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C380585 Verify that "Birth date", "Date enrolled", "Expiration date" fields are formatted to show date only (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C380585'] },
      () => {
        // Step 1: Verify record type and identifier area
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

        // Step 2: Upload the CSV file
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Show date columns and verify format (MM/DD/YYYY, no time)
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BIRTH_DATE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.DATE_ENROLLED,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
          user.barcode,
          expectedDateFields,
        );

        // Step 4: Download matched records and verify date format in CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
          user.barcode,
          expectedDateFieldsInFile,
        );

        // Step 5: Open bulk edit form
        BulkEditActions.openStartBulkEditForm();

        // Step 6: Change patron group and confirm changes
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();

        // Step 7: Verify date format in "Are you sure?" preview (MM/DD/YYYY, no time)
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          user.barcode,
          expectedDateFields,
        );

        // Step 8: Download preview and verify date format in CSV
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
          user.barcode,
          [
            ...expectedDateFieldsInFile,
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: 'faculty',
            },
          ],
        );

        // Step 9: Commit changes
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        // Step 10: Verify date format in "Preview of records changed" (MM/DD/YYYY, no time)
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          user.barcode,
          expectedDateFields,
        );

        // Step 11: Download changed records and verify date format in CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
          user.barcode,
          [
            ...expectedDateFieldsInFile,
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: 'faculty',
            },
          ],
        );
      },
    );
  });
});
