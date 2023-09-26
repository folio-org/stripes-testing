import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const invalidHoldingHRID = getRandomPostfix();
const invalidHoldingHRIDsFileName = `invalidHoldingHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidHoldingHRIDsFileName}*`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${invalidHoldingHRIDsFileName}`, invalidHoldingHRID);
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidHoldingHRIDsFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask(
      invalidHoldingHRIDsFileName,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375299 Verify generated Logs files for Holdings In app -- only invalid records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
      BulkEditSearchPane.uploadFile(invalidHoldingHRIDsFileName);
      BulkEditActions.openActions();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowAction();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(invalidHoldingHRIDsFileName, [invalidHoldingHRID]);

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidHoldingHRID],
        'firstElement',
        false,
      );
    },
  );
});
