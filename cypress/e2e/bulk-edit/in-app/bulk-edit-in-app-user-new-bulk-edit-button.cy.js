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
const matchedRecordsFileName = `*-Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        })
        .then(() => {
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          const newName = `testName_${getRandomPostfix()}`;
          BulkEditActions.downloadMatchedResults();
          BulkEditActions.prepareValidBulkEditFile(matchedRecordsFileName, editedFileName, 'testPermFirst', newName);
          BulkEditActions.openStartBulkEditForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(newName);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      Users.deleteViaApi(user.userId);
    });

    it('C353551 Verify new bulk edit button (firebird)', { tags: [testTypes.extendedPath, devTeams.firebird] }, () => {
      BulkEditActions.newBulkEdit();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.usersRadioIsDisabled(false);
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifyDefaultFilterState();
    });
  });
