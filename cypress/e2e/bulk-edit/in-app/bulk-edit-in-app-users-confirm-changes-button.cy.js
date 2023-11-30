import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        },
      );
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C360536 Verify that the "Confirm changes" button is disabled until at least one update action is selected (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.selectOption('Patron group');
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillExpirationDate(new Date(), 1);
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
        BulkEditSearchPane.isConfirmButtonDisabled(false);
      }
    );
  });
});
