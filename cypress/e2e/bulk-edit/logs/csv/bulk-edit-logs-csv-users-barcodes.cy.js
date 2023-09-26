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
const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
const invalidUserBarcode = getRandomPostfix();
const invalidAndValidUserBarcodesFileName = `invalidAndValidUserBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${invalidAndValidUserBarcodesFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidAndValidUserBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = {
  first: `*-Updates-Preview-${invalidAndValidUserBarcodesFileName}`,
  second: `*-Updates-Preview-${editedFileName}`,
};
const updatedRecordsFileName = `*-Changed-Records*-${invalidAndValidUserBarcodesFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${invalidAndValidUserBarcodesFileName}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([]).then((userProperties) => {
      userWithoutPermissions = userProperties;
    });
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(
        `cypress/fixtures/${invalidAndValidUserBarcodesFileName}`,
        `${user.barcode}\n${userWithoutPermissions.barcode}\n${invalidUserBarcode}`,
      );
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${invalidAndValidUserBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(userWithoutPermissions.userId);
    FileManager.deleteFileFromDownloadsByMask(
      invalidAndValidUserBarcodesFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName.first,
      previewOfProposedChangesFileName.second,
      updatedRecordsFileName,
      errorsFromCommittingFileName,
      errorsFromMatchingFileName,
    );
  });

  it(
    'C375215 Verify generated Logs files for Users CSV - with errors (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
      BulkEditSearchPane.uploadFile(invalidAndValidUserBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.downloadErrors();

      BulkEditActions.prepareValidBulkEditFile(
        matchedRecordsFileName,
        editedFileName,
        user.firstName,
        newFirstName,
      );

      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(editedFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyChangedResults(newFirstName);
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditActions.downloadErrors();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompletedWithErrors();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(invalidAndValidUserBarcodesFileName, [
        user.barcode,
        userWithoutPermissions.barcode,
        invalidUserBarcode,
      ]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [user.barcode, userWithoutPermissions.barcode],
        'userBarcode',
        true,
      );

      BulkEditSearchPane.downloadFileWithErrorsEncountered();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromMatchingFileName,
        [invalidUserBarcode],
        'firstElement',
        false,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName.first,
        [newFirstName, userWithoutPermissions.firstName],
        'firstName',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [newFirstName, userWithoutPermissions.firstName],
        'firstName',
        true,
      );

      BulkEditSearchPane.downloadFileWithCommitErrors();
      BulkEditFiles.verifyMatchedResultFileContent(
        errorsFromCommittingFileName,
        [userWithoutPermissions.barcode],
        'firstElement',
        false,
      );
    },
  );
});
