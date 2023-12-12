import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../support/fragments/users/users';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import FileManager from '../../support/utils/fileManager';
import BulkEditFiles from '../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('export-manager', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUserEdit.gui,
      permissions.exportManagerAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
    FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
  });

  it(
    'C365102 Verify hyperlink on the "JobID" column -- Local approach (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
      BulkEditSearchPane.uploadFile(userBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      const newName = `testName_${getRandomPostfix()}`;
      BulkEditActions.prepareValidBulkEditFile(
        matchedRecordsFileName,
        editedFileName,
        user.username,
        newName,
      );
      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(editedFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();
      cy.visit(TopMenu.exportManagerPath);
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.searchByBulkEdit();
      ExportManagerSearchPane.selectJob(user.username);
      cy.intercept('GET', '/data-export-spring/jobs/*').as('getId');
      cy.wait('@getId', { timeout: 10000 }).then((item) => {
        const jobID = item.response.body.name;
        ExportManagerSearchPane.verifyJobDataInResults(['Successful', 'Bulk edit identifiers']);
        ExportManagerSearchPane.clickJobIdInThirdPane();
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          [user.barcode],
          'userBarcode',
          true,
        );
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
        ExportDetails.closeJobDetails();
        ExportManagerSearchPane.clickJobId(jobID);
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          [user.barcode],
          'userBarcode',
          true,
        );
      });
    },
  );
});
