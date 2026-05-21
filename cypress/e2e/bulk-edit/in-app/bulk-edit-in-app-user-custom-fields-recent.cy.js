import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import { generateMultiSelectCustomFieldData } from '../../../support/utils/customFields';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let customFieldData;
let updatedCustomFieldData;
let userBarcodesFileName;
let previewOfProposedChangesFileName;
let createdCustomFieldIds;

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
        customFieldData = {
          fieldLabel: `fieldLabel-${getRandomPostfix()}`,
          label1: `label1-${getRandomPostfix()}`,
          label2: `label2-${getRandomPostfix()}`,
        };
        updatedCustomFieldData = {
          fieldLabel: `updated-fieldLabel-${getRandomPostfix()}`,
          label1: `updated-label1-${getRandomPostfix()}`,
          label2: `updated-label2-${getRandomPostfix()}`,
        };
        userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
        previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${userBarcodesFileName}`;
        createdCustomFieldIds = [];

        const multiSelectCustomField = generateMultiSelectCustomFieldData({
          testNumber: '389570',
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

        cy.getAdminToken()
          .then(() => {
            return cy
              .createTempUser(
                [
                  permissions.bulkEditUpdateRecords.gui,
                  permissions.bulkEditLogsView.gui,
                  permissions.uiUsersPermissionsView.gui,
                  permissions.uiUsersCustomField.gui,
                  permissions.uiUserEdit.gui,
                ],
                'faculty',
              )
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
          });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(previewOfProposedChangesFileName);

        if (createdCustomFieldIds?.length) {
          cy.deleteCustomFieldsViaApi({ ids: createdCustomFieldIds });
        }

        if (user?.userId) {
          Users.deleteViaApi(user.userId);
        }
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

          BulkEditActions.openStartBulkEditForm();
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
          BulkEditActions.openStartBulkEditForm();
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
        },
      );
    });
  },
);
