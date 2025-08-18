import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'staff',
      ).then((userProperties) => {
        user = userProperties;
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
      'C360537 Verify that the "Confirm changes" button is disabled until all fields are filled in Email update (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C360537'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
        BulkEditActions.openStartBulkEditForm();
        const oldEmailDomain = 'folio.org';
        const newEmailDomain = 'google.com';
        BulkEditActions.replaceEmail(oldEmailDomain, newEmailDomain);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)', 1);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyChangedResults(`test@${newEmailDomain}`);
      },
    );
  });
});
