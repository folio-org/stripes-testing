import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const invalidUsername = `invalidUsername_${getRandomPostfix()}`;
const invalidUsernamesFilename = `invalidUsername_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidUsernamesFilename}*`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${invalidUsernamesFilename}`, invalidUsername);
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidUsernamesFilename}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask(
      invalidUsernamesFilename,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375246 Verify generated Logs files for Users In app -- only invalid records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsernamesArea();
      BulkEditSearchPane.uploadFile(invalidUsernamesFilename);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyErrorLabel(invalidUsernamesFilename, 0, 1);
      BulkEditSearchPane.verifyNonMatchedResults(invalidUsername);
      BulkEditActions.openActions();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrorsWithoutModification();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(invalidUsernamesFilename, [invalidUsername]);

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidUsername],
        'firstElement',
        false,
      );
    },
  );
});
