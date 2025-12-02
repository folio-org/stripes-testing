import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../support/fragments/topMenu';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const customFieldData = {
  fieldLabel: `Custom]field${getRandomPostfix()}`,
  label1: `label[1]${getRandomPostfix()}`,
  label2: `label{2}${getRandomPostfix()}`,
};
let userBarcodesFileName;

describe('Bulk-edit', () => {
  describe(
    'In-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
          permissions.uiUsersCanViewCustomFields.gui,
          permissions.uiUsersCustomField.gui,
          permissions.uiUsersCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);

          cy.loginAsAdmin({
            path: SettingsMenu.customFieldsPath,
            waiter: CustomFields.waitLoading,
          });

          CustomFields.addMultiSelectCustomField(customFieldData);

          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(user.username);
          UserEdit.addMultiSelectCustomField(customFieldData);
          Users.verifyCustomFieldOnUserDetailsPane(
            customFieldData.fieldLabel,
            `${customFieldData.label1}, ${customFieldData.label2}`,
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
        Users.deleteViaApi(user.userId);
        cy.loginAsAdmin({
          path: SettingsMenu.customFieldsPath,
          waiter: CustomFields.waitLoading,
        });
        CustomFields.deleteCustomField(customFieldData.fieldLabel);
      });

      it(
        'C367949 Verify bulk edit with Custom field contains special symbols (firebird)',
        { tags: ['extendedPath', 'firebird', 'C367949'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(user.barcode);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Custom fields');
          BulkEditSearchPane.verifyChangesUnderColumns(
            'Custom fields',
            `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
          );
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditForm();
          BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            user.barcode,
            'Patron group',
            'faculty',
          );
          BulkEditSearchPane.verifyChangesUnderColumns(
            'Custom fields',
            `${customFieldData.fieldLabel}:${customFieldData.label1};${customFieldData.label2}`,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(user.username);
          Users.verifyLastNameOnUserDetailsPane(user.username);
          Users.verifyPatronGroupOnUserDetailsPane('faculty');
        },
      );
    },
  );
});
