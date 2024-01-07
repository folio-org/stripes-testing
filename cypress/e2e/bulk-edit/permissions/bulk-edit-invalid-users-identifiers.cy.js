import TopMenu from '../../../support/fragments/topMenu';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchedRecordsFileName = `*Matching-Records-Errors-${userUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.exportManagerAll.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, invalidUserUUID);
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`);
    });

    it(
      'C360963 Verify behavior when uploading only invalid Users identifiers  (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        // Navigate to the "Bulk edit" app => Select "Users" App => Select "Users UUIDs" from "Records identifier" dropdown
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();

        // Upload .csv file  with **invalid** Users UUIDs by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 0, 1);
        BulkEditSearchPane.verifyPaneRecordsCount(0);
        BulkEditSearchPane.verifyNonMatchedResults();

        // Navigate to the "Export manager" app
        cy.visit(TopMenu.exportManagerPath);
        ExportManagerSearchPane.waitLoading();
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.verifyJobAmount(user.username, 1);
        ExportManagerSearchPane.selectJob(user.username);

        ExportManagerSearchPane.clickJobIdInThirdPane();
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          [user.userId],
          'userId',
          true,
        );
      },
    );
  });
});
