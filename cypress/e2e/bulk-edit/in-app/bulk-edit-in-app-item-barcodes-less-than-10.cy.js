import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
let itemBarcodesFileName;
let matchedRecordsFileName;
let fileContent = '';
const items = [];

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
        // Prepare 8 instances with one item each
        for (let i = 0; i < 8; i++) {
          items.push({
            instanceName: `testBulkEdit_${getRandomPostfix()}`,
            itemBarcode: getRandomPostfix(),
          });
        }
        itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          items.forEach((item) => {
            fileContent += `${item.itemBarcode}\n`;
            InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          });

          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        items.forEach((item) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      });

      it(
        'C358942 Verify that number of records matched for file with less than 10 item barcodes (firebird)',
        { tags: ['criticalPath', 'firebird', 'C358942'] },
        () => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          items.forEach((item) => {
            BulkEditSearchPane.verifySpecificItemsMatched(item.itemBarcode);
          });
          BulkEditActions.downloadMatchedResults();

          const values = BulkEditFiles.getValuesFromCSVFile(fileContent);
          ExportFile.verifyFileIncludes(matchedRecordsFileName, values);
        },
      );
    });
  },
);
