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
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchRecordsFileName = 'Matched-Records';
const importFileName = `bulkEditImport_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}\r\n${invalidUserUUID}`);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      Users.deleteViaApi(user.userId);
    });

    afterEach('reload bulk-edit page', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it('C356817 Verify Matched records label cleanup -- CSV approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyMatchedResults(user.username);
      BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);
      BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
      BulkEditSearchPane.verifyPaneRecordsCount(1);

      BulkEditActions.downloadMatchedResults();
      const newName = `testName_${getRandomPostfix()}`;
      BulkEditActions.prepareValidBulkEditFile(matchRecordsFileName, importFileName, 'testPermFirst', newName);
      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(importFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyChangedResults(newName);
    });
  });
});
