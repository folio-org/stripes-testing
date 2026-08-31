import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

let user;
const patronGroup = 'graduate (Graduate Student)';
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${userUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditUsersDelete.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUsersCreate.gui,
        ],
        'undergrad',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `"${user.userId}"`);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(
        `*${matchedRecordsFileName}`,
        previewOfProposedChangesFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C1385653 User with "data - UI-Bulk-Edit Users - delete" and "data - UI-Users - edit" permissions is able to start bulk edit but NOT able to start bulk delete of Users (athena)',
      { tags: ['smoke', 'athena', 'C1385653'] },
      () => {
        // Step 1-2: Upload a .csv file with User UUIDs
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        // Step 3: Open "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.startBulkEditButtonExists();
        BulkEditActions.verifySelectBulkEditProfileButtonExists('users');
        BulkEditActions.startBulkDeleteAbsent();

        // Step 4: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        // Step 5: Start bulk edit
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditForm();

        // Step 6-7: Select "Patron group" option, choose new value and confirm changes
        BulkEditActions.fillPatronGroup(patronGroup);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, user.username);

        // Step 8: Download preview in CSV format
        BulkEditActions.downloadPreview();

        // Step 9: Commit changes and verify preview of records changed
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults('graduate');

        // Step 10: Download changed records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        // Step 11: Verify changes applied to the User record in Users app
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(user.username);
        UsersSearchPane.openUser(user.username);
        UsersCard.verifyPatronBlockValue('graduate');
      },
    );
  });
});
