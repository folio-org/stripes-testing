import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
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

let user;
let userBarcodesFileName;
let customFieldName;
let customFieldText;
let matchedRecordsFileName;
let changedRecordsFileName;
let previewFileName;
const testUsers = [];
const testUsersBarcodes = [];

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        cy.clearLocalStorage();
        testUsers.length = 0;
        testUsersBarcodes.length = 0;
        userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
        customFieldName = `customFieldName-${getRandomPostfix()}`;
        customFieldText = `customFieldText\n${getRandomPostfix()}`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userBarcodesFileName);
        previewFileName = BulkEditFiles.getPreviewFileName(userBarcodesFileName);

        for (let i = 0; i < 10; i++) {
          cy.createTempUser([], 'staff').then((userProperties) => {
            testUsers.push(userProperties);
            testUsersBarcodes.push(userProperties.barcode);
          });
        }

        cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui])
          .then((userProperties) => {
            user = userProperties;

            FileManager.createFile(
              `cypress/fixtures/${userBarcodesFileName}`,
              testUsersBarcodes.join('\n'),
            );
          })
          .then(() => {
            cy.loginAsAdmin({
              path: SettingsMenu.customFieldsPath,
              waiter: CustomFields.waitLoading,
            });
            CustomFields.addTextAreaCustomField(customFieldName);
            CustomFields.verifyCustomFieldExists(customFieldName);
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
            UsersSearchPane.searchByKeywords(testUsersBarcodes[0]);
            UserEdit.addCustomField(customFieldName, customFieldText);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });

      afterEach('delete test data', () => {
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
        { tags: ['criticalPath', 'firebird', 'C399098'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(...testUsersBarcodes);
          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');
          BulkEditActions.openStartBulkEditForm();

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

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByKeywords(testUsersBarcodes[0]);
          Users.verifyPatronGroupOnUserDetailsPane('faculty');
          Users.verifyCustomFieldOnUserDetailsPane(customFieldName, customFieldText);

          cy.loginAsAdmin({
            path: SettingsMenu.customFieldsPath,
            waiter: CustomFields.waitLoading,
          });
          CustomFields.deleteCustomField(customFieldName);
        },
      );
    });
  },
);
