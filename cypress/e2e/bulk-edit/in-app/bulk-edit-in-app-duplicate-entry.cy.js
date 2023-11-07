import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import testTypes from '../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
let viewUser;
const invalidBarcode = getRandomPostfix();
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const invalidUserBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidUserBarcodesFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditCsvView.gui, permissions.uiUsersView.gui]).then(
        (userProperties) => {
          viewUser = userProperties;
        },
      );
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${item.itemBarcode}\n${item.itemBarcode}`,
        );
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${user.barcode}\n${user.barcode}`,
        );
        FileManager.createFile(
          `cypress/fixtures/${invalidUserBarcodesFileName}`,
          `${user.barcode}\n${user.barcode}\n${invalidBarcode}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);
    });

    it(
      'C350933 Verify Errors accordion with repeated records (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(userBarcodesFileName, 1, 1);
        BulkEditSearchPane.verifyReasonForError('Duplicate entry');

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(itemBarcodesFileName, 1, 1);
        BulkEditSearchPane.verifyReasonForError('Duplicate entry');
      },
    );

    it(
      'C347883 Error messages in submitted identifiers (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        cy.login(viewUser.username, viewUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidUserBarcodesFileName, 1, 2);
        BulkEditSearchPane.verifyReasonForError('Duplicate entry');
        BulkEditSearchPane.verifyReasonForError('No match found');
        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
          user.barcode,
          invalidBarcode,
          'Duplicate entry',
          'No match found',
        ]);
      },
    );
  });
});
