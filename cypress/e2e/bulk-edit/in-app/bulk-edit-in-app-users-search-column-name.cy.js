import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const invalidUserUUID = getRandomPostfix();
const validUserUUIDsFileName = `validUserUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUIDsFileName = `invalidUserUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${invalidUserUUIDsFileName}`, invalidUserUUID);
        FileManager.createFile(`cypress/fixtures/${validUserUUIDsFileName}`, user.userId);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${invalidUserUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validUserUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C692094 Verify "Search column name" search box for Users (firebird)',
      { tags: ['smoke', 'firebird', 'C692094'] },
      () => {
        cy.viewport(1000, 660);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(validUserUUIDsFileName);
        BulkEditSearchPane.checkForUploading(validUserUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyUsersActionShowColumns();
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        BulkEditSearchPane.searchColumnName('id');
        const columnNameId = 'User id';
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnNameId);
        BulkEditSearchPane.verifyResultColumnTitles(columnNameId);
        BulkEditSearchPane.clearSearchColumnNameTextfield();

        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.searchColumnName('user');
        const columnNameUsername = 'Username';
        BulkEditSearchPane.uncheckShowColumnCheckbox(columnNameUsername);
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnNameUsername);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(invalidUserUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidUserUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidUserUUIDsFileName, 0, 1);
        BulkEditSearchPane.verifyPaneRecordsCount(0);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditSearchPane.searchColumnNameTextfieldDisabled();
      },
    );
  });
});
