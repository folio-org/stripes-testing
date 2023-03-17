import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let userWithoutPermissions;
const invalidUserBarcode = getRandomPostfix();
const invalidAndValidUserBarcodesFileName = `invalidAndValidUserBarcodess_${getRandomPostfix()}.csv`;
const matchRecordsFileNameInvalidAndValid = `Matched-Records-${invalidAndValidUserBarcodesFileName}`;
const errorsFromMatchingFileName = `*Errors-${invalidAndValidUserBarcodesFileName}*`;
const importFileName = `bulkEditImport_${getRandomPostfix()}.csv`;
const updatesPreviewFileName = `*Updates-Preview-${importFileName}`;
const newFirstName = `testNewFirstNameame_${getRandomPostfix()}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([])
      .then(userProperties => {
        userWithoutPermissions = userProperties;
      });
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
        FileManager.createFile(`cypress/fixtures/${invalidAndValidUserBarcodesFileName}`, `${user.barcode}\n${userWithoutPermissions.barcode}\n${invalidUserBarcode}`);
      });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidAndValidUserBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  // C375215 fails because of bug MODBULKOPS-74
  it('C375215 Verify generated Logs files for Users CSV - with errors (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    // Upload file with invalid and valid user UUIDs
    BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
    BulkEditSearchPane.uploadFile(invalidAndValidUserBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    // Download errors and matched results
    BulkEditActions.downloadMatchedResults();
    BulkEditActions.downloadErrors();

    // Modify matched results, upload and commit it
    BulkEditActions.prepareValidBulkEditFile(matchRecordsFileNameInvalidAndValid, importFileName, user.firstName, newFirstName);

    BulkEditActions.openStartBulkEditForm();
    BulkEditSearchPane.uploadFile(importFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.clickNext();
    BulkEditActions.commitChanges();

    // Verify changes on the page, download changes and errors
    BulkEditSearchPane.verifyChangedResults(newFirstName);
    BulkEditActions.openActions();
    BulkEditActions.downloadChangedCSV();
    BulkEditActions.downloadErrors();

    // Go to logs pane and verify elements
    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.clickActionsOnTheRow();
    BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrors();

    BulkEditSearchPane.downloadFileUsedToTrigger();
    BulkEditFiles.verifyCSVFileRows(`${invalidAndValidUserBarcodesFileName}*`, [user.barcode, userWithoutPermissions.barcode, invalidUserBarcode]);

    BulkEditSearchPane.downloadFileWithMatchingRecords();
    BulkEditFiles.verifyMatchedResultFileContent(`*${matchRecordsFileNameInvalidAndValid}*`, [user.barcode, userWithoutPermissions.barcode], 'userBarcode', true);

    BulkEditSearchPane.downloadFileWithErrorsEncountered();
    BulkEditFiles.verifyMatchedResultFileContent(errorsFromMatchingFileName, [invalidUserBarcode], 'firstElement', false);

    BulkEditSearchPane.downloadFileWithProposedChanges();
    BulkEditFiles.verifyMatchedResultFileContent(importFileName, [newFirstName, userWithoutPermissions.firstName], 'firstName', true);

    BulkEditSearchPane.downloadFileWithUpdatedRecords();
    BulkEditFiles.verifyMatchedResultFileContent(updatesPreviewFileName, [newFirstName, userWithoutPermissions.firstName], 'firstName', true);

    BulkEditSearchPane.downloadFileWithCommitErrors();
    BulkEditFiles.verifyMatchedResultFileContent(errorsFromMatchingFileName, [userWithoutPermissions.barcode], 'firstElement', false);
  });
});
