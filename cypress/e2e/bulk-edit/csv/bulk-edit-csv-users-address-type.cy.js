import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let addressTypeId;
let addressType;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${userBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUsersViewAllSettings.gui,
          permissions.uiUserEdit.gui,
        ],
        'faculty',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        userBarcodesFileName,
        matchedRecordsFileName,
        previewOfProposedChangesFileName,
        updatedRecordsFileName,
      );
      cy.getAdminToken(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C408810 Verify that "addressType" is shown in the Previews _ Locals (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C408810'] },
      () => {
        UsersSearchPane.searchByUsername(user.username);
        UserEdit.openEdit();
        UserEdit.addAddress();
        UserEdit.saveAndClose();
        cy.wait(2000);

        cy.getUsers({ limit: 1, query: `"username"="${user.username}"` })
          .then((users) => {
            addressTypeId = users[0].personal.addresses[0].addressTypeId;
          })
          .then(() => {
            Users.getUserAddressTypesApi(addressTypeId)
              .then((body) => {
                addressType = body.addressType;
              })
              .then(() => {
                TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

                BulkEditSearchPane.checkUsersRadio();
                BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
                BulkEditSearchPane.uploadFile(userBarcodesFileName);
                BulkEditSearchPane.waitFileUploading();
                BulkEditActions.downloadMatchedResults();
                BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Addresses');
                BulkEditSearchPane.verifyChangesUnderColumns('Addresses', addressType);

                const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
                BulkEditActions.prepareValidBulkEditFile(
                  matchedRecordsFileName,
                  editedFileName,
                  user.firstName,
                  newFirstName,
                );
                BulkEditActions.openStartBulkEditLocalForm();
                BulkEditSearchPane.uploadFile(editedFileName);
                BulkEditSearchPane.waitFileUploading();
                BulkEditActions.clickNext();
                BulkEditActions.commitChanges();
                BulkEditSearchPane.waitFileUploading();
                BulkEditActions.openActions();
                BulkEditActions.downloadMatchedRecordsAbsent();

                BulkEditSearchPane.openLogsSearch();
                BulkEditLogs.verifyLogsPane();
                BulkEditLogs.checkUsersCheckbox();
                BulkEditLogs.clickActionsRunBy(user.username);
                BulkEditLogs.verifyLogsRowActionWhenCompleted();

                BulkEditLogs.downloadFileUsedToTrigger();
                ExportFile.verifyFileIncludes(userBarcodesFileName, [user.barcode]);

                BulkEditLogs.downloadFileWithMatchingRecords();
                ExportFile.verifyFileIncludes(matchedRecordsFileName, [user.barcode]);

                BulkEditLogs.downloadFileWithProposedChanges();
                ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [newFirstName]);

                BulkEditLogs.downloadFileWithUpdatedRecords();
                ExportFile.verifyFileIncludes(updatedRecordsFileName, [newFirstName]);

                TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
                UsersSearchPane.resetAllFilters();
                UsersSearchPane.searchByUsername(user.username);
                Users.verifyFirstNameOnUserDetailsPane(newFirstName);
              });
          });
      },
    );
  });
});
