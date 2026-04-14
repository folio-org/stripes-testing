import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

let user;
let userUUIDsFileName;
let matchedRecordsFileName;
let editedFileName;
let newFirstName;
const testUsers = [];
const validUsersUUIDs = [];
const recordsNumber = 27;
const columnNames = [
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXTERNAL_SYSTEM_ID,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.ACTIVE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.TYPE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.DEPARTMENTS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PROXY_FOR,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.LAST_NAME,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.FIRST_NAME,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.MIDDLE_NAME,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PREFFERED_FIRST_NAME,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PHONE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.MOBILE_PHONE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BIRTH_DATE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.ADDRESSES,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PREFFERED_CONTACT_TYPE_ID,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.LINK_TO_THE_PROFILE_PICTURE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.DATE_ENROLLED,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.TAGS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.CUSTOM_FIELDS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PREFFERED_EMAIL_COMMUNICATIONS,
];

describe('Bulk-edit', () => {
  describe('CSV approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
      matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
      editedFileName = `edited-records-${getRandomPostfix()}.csv`;
      newFirstName = `testNewFirstName_${getRandomPostfix()}`;
      testUsers.length = 0;
      validUsersUUIDs.length = 0;

      cy.then(() => {
        for (let i = 0; i < recordsNumber; i++) {
          cy.createTempUser([]).then((userProperties) => {
            testUsers.push(userProperties);
            validUsersUUIDs.push(userProperties.userId);
          });
        }
      }).then(() => {
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, validUsersUUIDs.join('\n'));
      });

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
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      testUsers.forEach((testUser) => Users.deleteViaApi(testUser.userId));
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`);
    });

    it(
      'C389474 Local | Verify that column names are sticky for previews (firebird)',
      { tags: ['extendedPath', 'firebird', 'C389474'] },
      () => {
        // Step 1: Navigate to Bulk edit app with Users and User UUIDs identifier
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');

        // Step 2: Upload CSV file with User UUIDs
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.checkForUploading(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Click Actions menu and check all column checkboxes
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyUsersActionShowColumns();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...columnNames);
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(true, ...columnNames);

        // Step 4: Verify Preview of records matched is scrollable
        BulkEditSearchPane.verifyPreviewOfRecordMatchedScrollableHorizontally();
        BulkEditSearchPane.verifyPreviewOfRecordMatchedScrollableVertically();

        // Step 5: Verify sticky headers after scrolling - split columns into sets
        const firstSetOfColumnNames = columnNames.slice(0, 7);
        const secondSetOfColumnNames = columnNames.slice(7, 18);
        const thirdSetOfColumnNames = columnNames.slice(18);

        firstSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyResultColumnTitles(columnName);
        });

        BulkEditSearchPane.scrollInMatchedAccordion('center');

        secondSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyResultColumnTitles(columnName);
        });

        BulkEditSearchPane.scrollInMatchedAccordion('right');

        thirdSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyResultColumnTitles(columnName);
        });

        BulkEditSearchPane.scrollInMatchedAccordion('bottomRight');

        thirdSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyResultColumnTitles(columnName);
        });

        // Step 6: Download matched records CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        // Step 7: Modify downloaded file - change first user's first name
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          testUsers[0].firstName,
          newFirstName,
        );

        // Step 8: Click Actions menu, select "Start bulk edit (Local)"
        BulkEditActions.openStartBulkEditLocalForm();

        // Step 9: Upload modified file to Drag & drop zone
        BulkEditSearchPane.uploadFile(editedFileName);

        // Step 10: Verify file uploading state and wait for upload completion
        BulkEditSearchPane.waitFileUploading();

        // Step 11: Click Next, then Commit changes
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(recordsNumber);

        // Step 12: Verify Preview of record changed is scrollable
        BulkEditSearchPane.verifyPreviewOfRecordChangedScrollableHorizontally();
        BulkEditSearchPane.verifyPreviewOfRecordChangedScrollableVertically();

        // Step 13: Verify sticky headers in Preview of records changed
        firstSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
        });

        BulkEditSearchPane.scrollInChangedAccordion('center');

        secondSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
        });

        BulkEditSearchPane.scrollInChangedAccordion('right');

        thirdSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
        });

        BulkEditSearchPane.scrollInChangedAccordion('bottomRight');

        thirdSetOfColumnNames.forEach((columnName) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
        });

        BulkEditActions.verifySuccessBanner(recordsNumber);

        // Step 14: Navigate to Users app and verify changes were applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(testUsers[0].username);
        Users.verifyFirstNameOnUserDetailsPane(newFirstName);
      },
    );
  });
});
