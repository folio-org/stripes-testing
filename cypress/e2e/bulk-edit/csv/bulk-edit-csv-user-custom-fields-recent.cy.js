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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const customFieldData = {
  fieldLabel: `fieldLabel${getRandomPostfix()}`,
  label1: `label1${getRandomPostfix()}`,
  label2: `label2${getRandomPostfix()}`,
};
const updatedCustomFieldData = {
  fieldLabel: `updated${getRandomPostfix()}`,
  label1: `updated${getRandomPostfix()}`,
  label2: `updated${getRandomPostfix()}`,
};
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiUsersCustomField.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.customFieldsPath,
          waiter: CustomFields.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        CustomFields.addMultiSelectCustomField(customFieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByUsername(user.username);
        UserEdit.addMultiSelectCustomField(customFieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C389569 Local | Verify bulk edit Users records with recently updated Custom fields (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C389569'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
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
        BulkEditActions.openStartBulkEditLocalForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.editMultiSelectCustomField(customFieldData, updatedCustomFieldData);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');

        const anotherFirstName = `testAnotherNewFirstName_${getRandomPostfix()}`;
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          newFirstName,
          anotherFirstName,
        );
        BulkEditActions.openStartBulkEditLocalForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
      },
    );
  });
});
