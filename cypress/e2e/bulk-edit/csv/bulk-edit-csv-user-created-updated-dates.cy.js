import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DateTools from '../../../support/utils/dateTools';

let user;
let updatedDate;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${userUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${userUUIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          user.userId,
        );
        cy.getUsers({ limit: 1, query: `"username"="${user.username}"` }).then((users) => {
          updatedDate = users[0].updatedDate;
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(
        userUUIDsFileName,
        matchedRecordsFileName,
        previewOfProposedChangesFileName,
        updatedRecordsFileName,
      );
    });

    it(
      'C411714 Verify that "Created date" and "Updated date" fields are system updated in User Bulk edit (Local approach) (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const newName = `testName_${getRandomPostfix()}`;
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.verifyUsersActionShowColumns();
        BulkEditSearchPane.verifyCheckboxesAbsent('Record created', 'Record updated');
        const userColumns = [
          'User name',
          'User id',
          'External system id',
          'Barcode',
          'Active',
          'Type',
          'Patron group',
          'Departments',
          'Proxy for',
          'Last name',
          'First name',
          'Middle name',
          'Preferred first name',
          'Email',
          'Phone',
          'Mobile phone',
          'Addresses',
          'Preferred contact type id',
          'Enrollment date',
          'Expiration date',
          'Tags',
          'Custom fields'
        ];
        ExportFile.verifyFileIncludes(matchedRecordsFileName, ['Date of birth', userColumns]);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, ['Created date', 'Updated date'], false);
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          'testPermFirst',
          newName,
        );

        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyChangedResults(newName);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        ExportFile.verifyFileIncludes(changedRecordsFileName, ['Date Of Birth', userColumns, newName]);
        ExportFile.verifyFileIncludes(changedRecordsFileName, ['Created date', 'Updated date'], false);

        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.checkUsersCheckbox();

        BulkEditSearchPane.clickActionsRunBy(user.username);
        BulkEditSearchPane.verifyLogsRowActionWhenCompleted();
        BulkEditSearchPane.downloadFileUsedToTrigger();
        ExportFile.verifyFileIncludes(userUUIDsFileName, [user.userId]);

        BulkEditSearchPane.downloadFileWithMatchingRecords();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, ['Date of birth', userColumns]);

        BulkEditSearchPane.downloadFileWithProposedChanges();
        ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, ['Date of birth', userColumns, newName]);

        BulkEditSearchPane.downloadFileWithUpdatedRecords();
        ExportFile.verifyFileIncludes(updatedRecordsFileName, ['Date Of Birth', userColumns, newName]);

        cy.getUsers({ limit: 1, query: `"username"="${user.username}"` }).then((users) => {
          cy.expect(users[0].updatedDate).to.include(today);
          cy.expect(users[0].updatedDate).to.not.eq(updatedDate);
        });
      },
    );
  });
});
