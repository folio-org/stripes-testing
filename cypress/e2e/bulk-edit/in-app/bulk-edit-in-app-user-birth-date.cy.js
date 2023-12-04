import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const birthdate = '1970-12-02';
const birthdateSlashFormat = '12/2/1970';
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${userBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
      ], 'staff').then((userProperties) => {
        user = userProperties;
        cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
          cy.updateUser({
            ...users[0],
            personal: { ...users[0].personal, dateOfBirth: birthdate },
          });
        });
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
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, previewFileName, changedRecordsFileName);
    });

    it(
      'C380585 Verify that "Birth date" field is formatted to show date only (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [`,${birthdate},`]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Birth date');
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Birth date', birthdateSlashFormat);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`,${birthdate},`]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Birth date', birthdateSlashFormat);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [`,${birthdate},`]);
      },
    );
  });
});
