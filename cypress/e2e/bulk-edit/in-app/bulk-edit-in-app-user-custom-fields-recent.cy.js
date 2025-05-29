import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;
const customFieldData = {
  fieldLabel: `fieldLabel-${getRandomPostfix()}`,
  label1: `label1-${getRandomPostfix()}`,
  label2: `label2-${getRandomPostfix()}`,
};
const updatedCustomFieldData = {
  fieldLabel: `updated-fieldLabel-${getRandomPostfix()}`,
  label1: `updated-label1-${getRandomPostfix()}`,
  label2: `updated-label2-${getRandomPostfix()}`,
};
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${userBarcodesFileName}`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [
          permissions.bulkEditUpdateRecords.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiUsersPermissionsView.gui,
          permissions.uiUsersCustomField.gui,
          permissions.uiUserEdit.gui,
        ],
        'faculty',
      ).then((userProperties) => {
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
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewOfProposedChangesFileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C389570 In app | Verify bulk edit Users records with recently updated Custom fields (firebird)',
      { tags: ['criticalPath', 'firebird', 'C389570'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('staff (Staff Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyMatchedResultFileContent(
          previewOfProposedChangesFileName,
          ['staff'],
          'patronGroup',
          true,
        );
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.waitLoading();
        CustomFields.editMultiSelectCustomField(customFieldData, updatedCustomFieldData);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyMatchedResultFileContent(
          previewOfProposedChangesFileName,
          ['graduate'],
          'patronGroup',
          true,
        );
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${updatedCustomFieldData.fieldLabel}:${updatedCustomFieldData.label1};${updatedCustomFieldData.label2}`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyPatronGroupOnUserDetailsPane('graduate');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.waitLoading();
        CustomFields.deleteCustomField(updatedCustomFieldData.fieldLabel);
      },
    );
  });
});
