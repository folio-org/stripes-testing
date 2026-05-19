import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import { generateMultiSelectCustomFieldData } from '../../../support/utils/customFields';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import UserEdit from '../../../support/fragments/users/userEdit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let createdCustomFieldIds = [];
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
const multiSelectCustomField = generateMultiSelectCustomFieldData({
  testNumber: '389569',
  data: {
    name: customFieldData.fieldLabel,
    selectField: {
      multiSelect: true,
      options: {
        values: [
          {
            id: 'opt_0',
            value: customFieldData.label1,
            default: false,
          },
          {
            id: 'opt_1',
            value: customFieldData.label2,
            default: false,
          },
        ],
      },
    },
  },
});

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.getAdminToken()
        .then(() => {
          return cy
            .createTempUser([
              permissions.bulkEditCsvView.gui,
              permissions.bulkEditCsvEdit.gui,
              permissions.bulkEditLogsView.gui,
              permissions.uiUsersCustomField.gui,
              permissions.uiUsersView.gui,
              permissions.uiUserEdit.gui,
            ])
            .then((userProperties) => {
              user = userProperties;
              FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);

              return cy
                .createCustomFieldsViaApi([multiSelectCustomField])
                .then((createdCustomFields) => {
                  createdCustomFieldIds = createdCustomFields.map(({ id }) => id);
                });
            });
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
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

      if (createdCustomFieldIds.length) {
        cy.deleteCustomFieldsViaApi({ ids: createdCustomFieldIds });
      }

      if (user?.userId) {
        Users.deleteViaApi(user.userId);
      }
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
        BulkEditSearchPane.errorsAccordionIsAbsent();
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
