import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const userUUIDsFileName = `C350905_userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();

describe('ui-users: file uploading', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}\r\n${invalidUserUUID}`);
      });
  });

  after('Delete all data', () => {
    cy.deleteUser(user.userId);
  });


  it('C350905 Negative uploading file with identifiers -- In app approach', { tags: [testTypes.smoke] }, () => {
    BulkEditSearchPane.checkUsersRadio();
    BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

    BulkEditSearchPane.uploadFile(userUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults([user.username]);
    BulkEditSearchPane.verifyNonMatchedResults([invalidUserUUID]);

    BulkEditSearchPane.verifyActionsAfterConductedUploading();
    BulkEditSearchPane.verifyActionShowColumns();

    BulkEditSearchPane.changeShowColumnCheckbox('Email');
    BulkEditSearchPane.verifyResultColumTitles('Email');

    BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
  });
});
