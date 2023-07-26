import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const invalidUsername = `username${getRandomPostfix()}`;
const invalidUsernamesFileName = `invalidUserUUIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*Errors-${invalidUsernamesFileName}*`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUsersView.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${invalidUsernamesFileName}`, invalidUsername);
      });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidUsernamesFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it('C405498 Verify generated Logs files for Users CSV -- only errors (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.verifyDragNDropUsernamesArea();
    BulkEditSearchPane.uploadFile(invalidUsernamesFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.downloadErrors();

    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.clickActionsOnTheRow();
    BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrorsWithoutModification();

    BulkEditSearchPane.downloadFileUsedToTrigger();
    BulkEditFiles.verifyCSVFileRows(invalidUsernamesFileName, [invalidUsername]);

    BulkEditSearchPane.downloadFileWithErrorsEncountered();
    BulkEditFiles.verifyMatchedResultFileContent(errorsFromMatchingFileName, [invalidUsername], 'firstElement', false);
  });
});
