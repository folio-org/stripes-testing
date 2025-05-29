import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.wait(5000);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359605 Verify that columns on the "Are you sure form" the same as on the "Preview of the matched records " (firebird)',
      { tags: ['criticalPath', 'firebird', 'C359605'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.verifyUsersActionShowColumns();
        BulkEditActions.verifyCheckedDropdownMenuItem();
        BulkEditActions.verifyUncheckedDropdownMenuItem();

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillExpirationDate(DateTools.getFutureWeekDateObj());
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, user.username);
      },
    );
  });
});
