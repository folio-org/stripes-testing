import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let addressTypeId;
let addressType;
const todayDate = new Date();
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);
const previewOfProposedChangesFileName = BulkEditFiles.getPreviewFileName(userBarcodesFileName);
const updatedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUsersViewAllSettings.gui,
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
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        userBarcodesFileName,
        matchedRecordsFileName,
        previewOfProposedChangesFileName,
        updatedRecordsFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C409410 Verify that "addressType" is shown in the Previews _ In app (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C409410'] },
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
                BulkEditActions.openActions();
                BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Addresses');
                BulkEditSearchPane.verifyChangesUnderColumns('Addresses', addressType);
                BulkEditActions.openInAppStartBulkEditFrom();
                BulkEditActions.fillExpirationDate(todayDate);
                BulkEditActions.addNewBulkEditFilterString();
                BulkEditActions.fillPatronGroup('graduate (Graduate Student)', 1);
                BulkEditActions.confirmChanges();
                BulkEditActions.verifyAreYouSureForm(1, user.username);
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
                ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, ['graduate']);

                BulkEditLogs.downloadFileWithUpdatedRecords();
                ExportFile.verifyFileIncludes(updatedRecordsFileName, ['graduate']);

                TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
                UsersSearchPane.searchByKeywords(user.username);
                UsersSearchPane.openUser(user.username);
                UsersCard.verifyExpirationDate(todayDate);
                UsersCard.verifyPatronBlockValue('graduate');
              });
          });
      },
    );
  });
});
