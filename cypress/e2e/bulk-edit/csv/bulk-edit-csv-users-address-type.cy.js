import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let addressTypeId;
let addressType;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
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
      { tags: ['extendedPath', 'firebird'] },
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
                cy.visit(TopMenu.bulkEditPath);

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
                BulkEditActions.openStartBulkEditForm();
                BulkEditSearchPane.uploadFile(editedFileName);
                BulkEditSearchPane.waitFileUploading();
                BulkEditActions.clickNext();
                BulkEditActions.commitChanges();
                BulkEditSearchPane.waitFileUploading();
                BulkEditActions.openActions();
                BulkEditActions.downloadMatchedRecordsAbsent();

                BulkEditSearchPane.openLogsSearch();
                BulkEditSearchPane.verifyLogsPane();
                BulkEditSearchPane.checkUsersCheckbox();
                BulkEditSearchPane.clickActionsRunBy(user.username);
                BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

                BulkEditSearchPane.downloadFileUsedToTrigger();
                ExportFile.verifyFileIncludes(userBarcodesFileName, [user.barcode]);

                BulkEditSearchPane.downloadFileWithMatchingRecords();
                ExportFile.verifyFileIncludes(matchedRecordsFileName, [user.barcode]);

                BulkEditSearchPane.downloadFileWithProposedChanges();
                ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [newFirstName]);

                BulkEditSearchPane.downloadFileWithUpdatedRecords();
                ExportFile.verifyFileIncludes(updatedRecordsFileName, [newFirstName]);

                cy.visit(TopMenu.usersPath);
                UsersSearchPane.searchByUsername(user.username);
                Users.verifyFirstNameOnUserDetailsPane(newFirstName);
              });
          });
      },
    );
  });
});
