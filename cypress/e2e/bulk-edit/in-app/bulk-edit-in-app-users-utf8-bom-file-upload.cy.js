import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let testUser;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const userUUIDsReplacedFileName = `userUUIDs_replaced_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.createTempUser([
            permissions.bulkEditUpdateRecords.gui,
            permissions.uiUserEdit.gui,
          ]).then((testUserProperties) => {
            testUser = testUserProperties;

            // Create UTF-8 with BOM files by prepending BOM character (\uFEFF)
            const originalOrder = `\uFEFF${user.userId}\n${testUser.userId}`;

            FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, originalOrder);

            const swappedOrder = `\uFEFF${testUser.userId}\n${user.userId}`;

            FileManager.createFile(`cypress/fixtures/${userUUIDsReplacedFileName}`, swappedOrder);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsReplacedFileName}`);
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(testUser.userId);
    });

    it(
      'C651414 Verify uploading file with User UUIDs formated in .csv UTF-8 with BOM does not result in error for the first record from the uploaded file (firebird)',
      { tags: ['extendedPath', 'firebird', 'C651414'] },
      () => {
        // Step 1: Click on "Users" radio button under "Record types" accordion.
        BulkEditSearchPane.checkUsersRadio();

        // Step 2: Click on "Select record identifier" dropdown > select "User UUIDs".
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');

        // Step 3: Upload .csv file from preconditions 2 by clicking "or choose file" button and selecting it or drop it into "Drag and drop" area.
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.checkForUploading(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username, testUser.username);
        BulkEditSearchPane.errorsAccordionIsAbsent();

        // Step 4: Return to the homepage of Bulk edit app via URL > repeat steps 1-3, but this time use file from Preconditions 3.
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

        BulkEditSearchPane.uploadFile(userUUIDsReplacedFileName);
        BulkEditSearchPane.checkForUploading(userUUIDsReplacedFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(user.username, testUser.username);
        BulkEditSearchPane.errorsAccordionIsAbsent();
      },
    );
  });
});
