import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    afterEach('open new bulk-edit form', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it('C359248 Verify "Email" option in bulk edit (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

      BulkEditSearchPane.uploadFile(userBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.verifyBulkEditForm();
    });
  });
});
