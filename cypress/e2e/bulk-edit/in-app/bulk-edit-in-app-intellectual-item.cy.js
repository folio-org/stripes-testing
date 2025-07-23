import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let item;
let itemBarcodesFileName;
let changedRecordsFileName;

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
        item = {
          instanceName: `testBulkEdit_${getRandomPostfix()}`,
          barcode: getRandomPostfix(),
        };
        itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
      });

      it(
        'C367922 Verify that User can update item status with "Intellectual item" (firebird)',
        { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C367922'] },
        () => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.openActions();
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.replaceItemStatus('Intellectual item');
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          ExportFile.verifyFileIncludes(changedRecordsFileName, ['Intellectual item']);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
          ItemRecordView.verifyItemStatus('Intellectual item');
        },
      );
    });
  },
);
