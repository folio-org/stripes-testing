import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;
let secondUser;
const customFieldData = {
  fieldLabel: `fieldLabel;${getRandomPostfix()}`,
  label1: `label1;${getRandomPostfix()}`,
  label2: `label2;${getRandomPostfix()}`,
};
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiUsersPermissionsView.gui,
        permissions.uiUsersCustomField.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
      });
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
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        cy.reload();
        UserEdit.addMultiSelectCustomField(customFieldData);
        cy.visit(TopMenu.bulkEditPath);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        previewOfProposedChangesFileName,
        changedRecordsFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      "C389568 In app | Verify that User's Custom fields with semicolons are updated correctly (firebird)",
      { tags: ['criticalPath', 'firebird'] },
      () => {
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

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        Users.verifyPatronGroupOnUserDetailsPane('staff');
      },
    );

    it(
      'C380731 Verify that User\'s Custom fields with special characters are displayed consistently through "Previews" and downloaded Bulk edit files (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        const today = new Date();
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        cy.wait(500);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillExpirationDate(today);
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        );
        BulkEditActions.openActions();
        cy.wait(500);
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        ]);

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.clickActionsRunBy(secondUser.username);
        BulkEditLogs.downloadFileWithProposedChanges();
        ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        ]);
        BulkEditLogs.downloadFileWithUpdatedRecords();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
        ]);

        cy.visit(SettingsMenu.customFieldsPath);
        CustomFields.deleteCustomField(customFieldData.fieldLabel);
      },
    );
  });
});
