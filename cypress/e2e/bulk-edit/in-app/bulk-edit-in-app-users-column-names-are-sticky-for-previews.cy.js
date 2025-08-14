import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  patronGroupNames,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

let user;
let userUUIDsFileName;
const testUsers = [];
const validUsersUUIds = [];
const recordsNumber = 27;
let invalidUserUUIDs;
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

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        cy.clearLocalStorage();
        userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
        invalidUserUUIDs = Array.from({ length: recordsNumber }, () => uuid());
        testUsers.length = 0;
        validUsersUUIds.length = 0;

        cy.then(() => {
          for (let i = 0; i < recordsNumber; i++) {
            cy.createTempUser([]).then((userProperties) => {
              testUsers.push(userProperties);
              validUsersUUIds.push(userProperties.userId);
            });
          }
        }).then(() => {
          FileManager.createFile(
            `cypress/fixtures/${userUUIDsFileName}`,
            `${validUsersUUIds.join('\n')}\n${invalidUserUUIDs.join('\n')}`,
          );
        });

        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        testUsers.forEach((testUser) => Users.deleteViaApi(testUser.userId));
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      });

      it(
        'C389485 In app | Verify that column names are sticky for previews (firebird)',
        { tags: ['criticalPath', 'firebird', 'C389485'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.checkForUploading(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyErrorLabel(recordsNumber);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyErrorsAccordionIncludesNumberOfIdentifiers(10, invalidUserUUIDs);
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyUsersActionShowColumns();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...columnNames);
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(true, ...columnNames);

          // it is necessary to split column names into sets because scrolling is required to display all the columns
          const firstSetOfColumnNames = columnNames.slice(0, 7);
          const secondSetOfColumnNames = columnNames.slice(7, 18);
          const thirdSetOfColumnNames = columnNames.slice(18);

          BulkEditSearchPane.verifyPreviewOfRecordMatchedScrollableHorizontally();
          BulkEditSearchPane.verifyPreviewOfRecordMatchedScrollableVertically();

          firstSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyResultColumnTitles(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInMatchedAccordion('center');

          secondSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyResultColumnTitles(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInMatchedAccordion('right');

          thirdSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyResultColumnTitles(columnName);
          });

          BulkEditSearchPane.scrollInMatchedAccordion('bottomRight');

          thirdSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyResultColumnTitles(columnName);
          });

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
          BulkEditActions.confirmChanges();

          validUsersUUIds.forEach((userBarcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              userBarcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              patronGroupNames.FACULTY,
            );
          });

          BulkEditSearchPane.verifyAreYouSureFormScrollableHorizontally();
          BulkEditSearchPane.verifyAreYouSureFormScrollableVertically();

          // it is necessary to split column names into sets because scrolling is required to display all the columns
          const firstSetOfColumnNamesInAreYouSureForm = columnNames.slice(0, 4);
          const secondSetOfColumnNamesnAreYouSureForm = columnNames.slice(4, 10);
          const thirdSetOfColumnNamesnAreYouSureForm = columnNames.slice(10, 18);
          const fourthSetOfColumnNamesnAreYouSureForm = columnNames.slice(18);

          firstSetOfColumnNamesInAreYouSureForm.forEach((columnName) => {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInAreYouSureForm(1000, 0);

          secondSetOfColumnNamesnAreYouSureForm.forEach((columnName) => {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInAreYouSureForm(2000, 0);

          thirdSetOfColumnNamesnAreYouSureForm.forEach((columnName) => {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInAreYouSureForm('right');

          fourthSetOfColumnNamesnAreYouSureForm.forEach((columnName) => {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(columnName);
          });

          BulkEditSearchPane.scrollInAreYouSureForm('bottomRight');

          fourthSetOfColumnNamesnAreYouSureForm.forEach((columnName) => {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(columnName);
          });

          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(recordsNumber);
          BulkEditSearchPane.verifyPaneRecordsChangedCount(`${recordsNumber} user`);
          BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);

          validUsersUUIds.forEach((userBarcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              userBarcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              patronGroupNames.FACULTY,
            );
          });

          BulkEditSearchPane.verifyPreviewOfRecordChangedScrollableHorizontally();
          BulkEditSearchPane.verifyPreviewOfRecordChangedScrollableVertically();

          firstSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInChangedAccordion('center');

          secondSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
          });

          // it is necessary to scroll to see the next set of the columns
          BulkEditSearchPane.scrollInChangedAccordion('right');

          thirdSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
          });

          BulkEditSearchPane.scrollInChangedAccordion('bottomRight');

          thirdSetOfColumnNames.forEach((columnName) => {
            BulkEditSearchPane.verifyChangedColumnTitlesInclude(columnName);
          });

          BulkEditActions.verifySuccessBanner(recordsNumber);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);

          validUsersUUIds.forEach((validUsersUUId) => {
            UsersSearchPane.searchByKeywords(validUsersUUId);
            Users.verifyPatronGroupOnUserDetailsPane(patronGroupNames.FACULTY);
            UsersSearchPane.resetAllFilters();
          });
        },
      );
    });
  },
);
