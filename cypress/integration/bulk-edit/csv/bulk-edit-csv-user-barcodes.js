import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from "../../../support/fragments/users/users";
import BulkEditActions from "../../../support/fragments/bulk-edit/bulk-edit-actions";

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;


describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
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
  });
});
