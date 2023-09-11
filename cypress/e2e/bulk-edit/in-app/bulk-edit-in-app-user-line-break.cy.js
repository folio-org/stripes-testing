import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import testTypes from '../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileManager from '../../../support/utils/fileManager';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

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
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(...testUsersBarcodes);
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckbox('Custom fields');
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
