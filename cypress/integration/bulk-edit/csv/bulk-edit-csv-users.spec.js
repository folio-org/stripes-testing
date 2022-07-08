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
const userUUIDsFileName = `C350905_userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchRecordsFileName = `C353233_matchedRecords_${getRandomPostfix()}.csv`;
const importFileName = `C353233_bulkEditImport_${getRandomPostfix()}.csv`;

describe('bulk-edit: csv file uploading', () => {
  before('create user', () => {
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

  after('Delete all data', () => {
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
    FileManager.deleteFile(`cypress/downloads/${matchRecordsFileName}`);
    Users.deleteViaApi(user.userId);
  });


  it('C350928 Verify error accordion during matching (CSV approach)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.checkUsersRadio();
    BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

    BulkEditSearchPane.uploadFile(userUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults(user.username);
    BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

    BulkEditSearchPane.verifyActionsAfterConductedCSVUploading();
    BulkEditSearchPane.verifyUsersActionShowColumns();

    BulkEditSearchPane.changeShowColumnCheckbox('Email');
    BulkEditSearchPane.verifyResultColumTitles('Email');

    BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
    BulkEditActions.newBulkEdit();
  });

  it('C353233 Verify number of updated records', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

    // Upload file
    BulkEditSearchPane.uploadFile(userUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    // Prepare file for bulk edit
    BulkEditActions.downloadMatchedResults(matchRecordsFileName);
    BulkEditActions.prepareBulkEditFileForImport(matchRecordsFileName, importFileName, user.username, 'test');

    // Upload bulk edit file
    BulkEditActions.openStartBulkEditForm();
    BulkEditSearchPane.uploadFile(importFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.commitChanges();

    // Verify changes
    BulkEditSearchPane.verifyMatchedResults(user.username);
    BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
    BulkEditActions.newBulkEdit();
  });

  it('C357034 Verify elements of the bulk edit app -- CSV app', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

    BulkEditSearchPane.clickToBulkEditMainButton();
    BulkEditSearchPane.verifyDefaultFilterState();

    BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

    BulkEditSearchPane.uploadFile(userUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults(user.username);
    BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

    BulkEditSearchPane.clickToBulkEditMainButton();
    BulkEditSearchPane.verifyDefaultFilterState();
  });
});
