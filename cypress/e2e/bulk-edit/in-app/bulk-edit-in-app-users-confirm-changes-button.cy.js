import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        },
      );
    });

    beforeEach('login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C360536 Verify that the "Confirm changes" button is disabled until at least one update action is selected (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C360536'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.selectOption('Patron group');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillExpirationDate(new Date(), 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
        BulkEditActions.verifyConfirmButtonDisabled(false);
      },
    );

    it(
      'C360538 Verify that the "Confirm changes" button stays disabled when "Actions" option is empty (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C360538'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.selectOption('Patron group');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillExpirationDate(new Date(), 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.deleteRow();
        BulkEditActions.verifyConfirmButtonDisabled(false);
      },
    );
  });
});
