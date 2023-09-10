import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import parallelization from '../../../support/dictionary/parallelization';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;
const customFieldData = {
  fieldLabel: `fieldLabel;${getRandomPostfix()}`,
  label1: `label1;${getRandomPostfix()}`,
  label2: `label2;${getRandomPostfix()}`,
};
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', { retries: 1 }, () => {
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
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        UserEdit.addMultiSelectCustomField(customFieldData);
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewOfProposedChangesFileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C389568 In app | Verify that User's Custom fields with semicolons are updated correctly (firebird)",
      { tags: [testTypes.criticalPath, devTeams.firebird, parallelization.nonParallel] },
      () => {
        cy.visit(TopMenu.bulkEditPath);

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Custom fields');

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

        cy.visit(SettingsMenu.customFieldsPath);
        CustomFields.deleteCustomField(customFieldData.fieldLabel);
      },
    );
  });
});
