import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const invalidUserBarcodesFileName = `invalidUserBarcodes_${getRandomPostfix()}.csv`;


describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          // Create file with user barcodes
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
          FileManager.createFile(`cypress/fixtures/${invalidUserBarcodesFileName}`, getRandomPostfix());
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    afterEach('refresh bulk edit pane', () => {
      BulkEditActions.newBulkEdit();
    });

    it('C347872 Populating preview of matched records (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

      BulkEditSearchPane.uploadFile(userBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyUserBarcodesResultAccordion();
      BulkEditSearchPane.verifyMatchedResults(user.barcode);

      BulkEditActions.openActions();
      BulkEditActions.verifyUsersActionDropdownItems();
      BulkEditActions.verifyCheckedDropdownMenuItem();
      BulkEditActions.verifyUncheckedDropdownMenuItem();
    });

    it('C360556 Populating preview of matched records in case no matches (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

      BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.verifyUsersActionDropdownItems(true);
    });
  });
});
