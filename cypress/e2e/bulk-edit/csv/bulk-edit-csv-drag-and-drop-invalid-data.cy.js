import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const invalidIdentifiersFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
const csvContent = values.join('\n');

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${invalidIdentifiersFileName}`, csvContent);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken(() => {
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${invalidIdentifiersFileName}`);
    });

    it(
      'C353651 - "New bulk edit" button with invalid data (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C353651'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('0 user');
        BulkEditSearchPane.verifyErrorLabel(11);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        const top10Values = values.slice(0, 9);

        top10Values.forEach((value) => {
          BulkEditSearchPane.verifyNonMatchedResults(value);
        });

        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('0 item');
        BulkEditSearchPane.verifyErrorLabel(11);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        top10Values.forEach((value) => {
          BulkEditSearchPane.verifyNonMatchedResults(value);
        });

        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();

        BulkEditSearchPane.verifySetCriteriaPaneElements();
      },
    );
  });
});
