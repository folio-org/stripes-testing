import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UserEdit from '../../../support/fragments/users/userEdit';

let user;
const customFieldData = {
  fieldLabel: `csvFieldLabel;${getRandomPostfix()}`,
  label1: `label1;${getRandomPostfix()}`,
  label2: `label2;${getRandomPostfix()}`,
};
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);

        cy.loginAsAdmin({
          path: SettingsMenu.customFieldsPath,
          waiter: CustomFields.waitLoading,
        });
        CustomFields.addMultiSelectCustomField(customFieldData);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        UserEdit.addMultiSelectCustomField(customFieldData);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.loginAsAdmin();
      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(customFieldData.fieldLabel);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C389567 Local | Verify bulk edit Users records with Custom fields with semicolon (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');

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
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        );

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyFirstNameOnUserDetailsPane(newFirstName);
      }
    );
  });
});
