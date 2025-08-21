import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import { patronGroupNames } from '../../../support/constants';

let user;
const testUsers = [];
const testUsersBarcodes = [];
const recordsNumber = 10;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      for (let i = 0; i < recordsNumber; i++) {
        cy.createTempUser([], patronGroupNames.STAFF).then((userProperties) => {
          testUsers.push(userProperties);
          testUsersBarcodes.push(userProperties.barcode);
          FileManager.appendFile(
            `cypress/fixtures/${userBarcodesFileName}`,
            `${userProperties.barcode}\n`,
          );
        });
      }

      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.checkForUploading(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      testUsers.forEach((testUser) => Users.deleteViaApi(testUser.userId));
      Users.deleteViaApi(user.userId);
    });

    it(
      'C436880 Verify pagination with no more than 100 records - Identifier tab (firebird)',
      { tags: ['criticalPath', 'firebird', 'C436880'] },
      () => {
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(recordsNumber);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();

        testUsersBarcodes.forEach((userBarcode) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            userBarcode,
            'Patron group',
            patronGroupNames.FACULTY,
          );
        });

        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(recordsNumber);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(recordsNumber);
        BulkEditSearchPane.verifyPaneRecordsChangedCount(`${recordsNumber} user`);
        BulkEditSearchPane.verifyFileNameHeadLine(userBarcodesFileName);

        testUsersBarcodes.forEach((userBarcode) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            userBarcode,
            'Patron group',
            patronGroupNames.FACULTY,
          );
        });

        BulkEditSearchPane.verifyPaginatorInChangedRecords(recordsNumber);
      },
    );
  });
});
