import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const testUsers = [];
const testUsersBarcodes = [];
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const customFieldName = `customFieldName-${getRandomPostfix()}`;
const customFieldText = `customFieldText\n${getRandomPostfix()}`;
const matchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${userBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      for (let i = 0; i < 10; i++) {
        cy.createTempUser([], 'staff').then((userProperties) => {
          testUsers.push(userProperties);
          testUsersBarcodes.push(userProperties.barcode);
          FileManager.appendFile(
            `cypress/fixtures/${userBarcodesFileName}`,
            `${userProperties.barcode}\n`,
          );
        });
      }

      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.loginAsAdmin({
            path: SettingsMenu.customFieldsPath,
            waiter: CustomFields.waitLoading,
          });
          CustomFields.addTextAreaCustomField(customFieldName);
          cy.visit(TopMenu.usersPath);
          UsersSearchPane.searchByKeywords(testUsersBarcodes[0]);
          UserEdit.addCustomField(customFieldName, customFieldText);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      testUsers.forEach((testUser) => Users.deleteViaApi(testUser.userId));
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C399098 Verify Previews for the number of Users records if the record has field with line break (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(...testUsersBarcodes);
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(testUsersBarcodes.length, 'faculty');
        BulkEditActions.downloadPreview();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        BulkEditSearchPane.verifyChangedResults(...testUsersBarcodes);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Custom fields',
          `${customFieldName}:${customFieldText}`,
        );

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByKeywords(testUsersBarcodes[0]);
        Users.verifyPatronGroupOnUserDetailsPane('faculty');
        Users.verifyCustomFieldOnUserDetailsPane(customFieldName, customFieldText);

        cy.loginAsAdmin({ path: SettingsMenu.customFieldsPath, waiter: CustomFields.waitLoading });
        CustomFields.deleteCustomField(customFieldName);
      },
    );
  });
});
