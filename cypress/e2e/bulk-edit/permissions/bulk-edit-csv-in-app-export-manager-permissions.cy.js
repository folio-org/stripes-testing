import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;

const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const userMatchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const itemMatchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.uiUsersView.gui,
        permissions.exportManagerAll.gui,
        permissions.inventoryAll.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        })
        .then(() => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        itemMatchedRecordsFileName,
        userMatchedRecordsFileName,
      );
    });

    it(
      'C788694 Verify that user can view data in Export Manager(Local and In-app approach) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C788694'] },
      () => {
        ExportManagerSearchPane.waitLoading();
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.waitForJobs();
        ExportManagerSearchPane.getElementByTextAndVerify(user.username, 2, 0);
        ExportManagerSearchPane.clickJobIdInThirdPane();
        ExportFile.verifyFileIncludes(itemMatchedRecordsFileName, [item.itemBarcode]);

        ExportManagerSearchPane.getElementByTextAndVerify(user.username, 2, 1);
        ExportManagerSearchPane.clickJobIdInThirdPane();
        ExportFile.verifyFileIncludes(userMatchedRecordsFileName, [user.userId]);
      },
    );
  });
});
