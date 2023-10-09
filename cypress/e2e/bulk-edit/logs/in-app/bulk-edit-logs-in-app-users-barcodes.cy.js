import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import DateTools from '../../../../support/utils/dateTools';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';

let user;
const afterThreeMonthsDate = DateTools.getAfterThreeMonthsDateObj();
const validUserBarcodesFileName = `validUserBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validUserBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${validUserBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validUserBarcodesFileName}`;

const newExpirationDate = {
  date: afterThreeMonthsDate,
  dateWithSlashes: DateTools.getFormattedDateWithSlashes({ date: afterThreeMonthsDate }),
  dateWithDashes: DateTools.getFormattedDate({ date: afterThreeMonthsDate }),
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${validUserBarcodesFileName}`, user.barcode);
    });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${validUserBarcodesFileName}`);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask(
      validUserBarcodesFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
    );
  });

  it(
    'C375244 Verify generated Logs files for Users In app -- only valid (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
      BulkEditSearchPane.uploadFile(validUserBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.downloadMatchedResults();

      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.verifyBulkEditForm();
      BulkEditActions.fillExpirationDate(newExpirationDate.date);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.fillPatronGroup('graduate (Graduate Student)', 1);
      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(validUserBarcodesFileName, [user.barcode]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [user.barcode],
        'userBarcode',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        ['graduate'],
        'patronGroup',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [newExpirationDate.dateWithDashes],
        'expirationDate',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        ['graduate'],
        'patronGroup',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [newExpirationDate.dateWithDashes],
        'expirationDate',
        true,
      );

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyPatronGroupOnUserDetailsPane('graduate');
      Users.verifyExpirationDateOnUserDetailsPane(newExpirationDate.dateWithSlashes);
    },
  );
});
