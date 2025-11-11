import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_STATUS_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
const numberOfIterations = 3;
const folioInstanceTitle = `AT_C356812_FolioInstance_${getRandomPostfix()}`;
const item = {
  barcode: `AT_C356812_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(folioInstanceTitle, item.barcode);

        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (itemData) => {
            item.id = itemData.id;
            item.hrid = itemData.hrid;
            item.holdingId = itemData.holdingsRecordId;
          },
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    });

    it(
      'C356812 Verify download matched records using Query search -- Items (firebird)',
      { tags: ['extendedPath', 'firebird', 'C356812'] },
      () => {
        let iterationNumber = 1;

        while (iterationNumber <= numberOfIterations) {
          const currentIteration = iterationNumber;

          // Step 1: Select "Inventory - items" radio button and click "Build query" button
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2: Build query that returns at least one record and click "Run query" button
          QueryModal.selectField(itemFieldValues.itemBarcode);
          QueryModal.verifySelectedField(itemFieldValues.itemBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(item.barcode);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
            `getPreview_${currentIteration}`,
          );
          QueryModal.clickRunQuery();
          QueryModal.absent();

          cy.wait(`@getPreview_${currentIteration}`, getLongDelay()).then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            const currentFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
              bulkEditJobId,
              true,
            );

            BulkEditSearchPane.verifyMatchedResults(item.barcode);
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 item');

            // Step 3: Click "Actions" menu and click "Download matched records (CSV)"
            BulkEditActions.downloadMatchedResults();

            // Step 4: Open downloaded file and check the records fulfill search criteria
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              currentFileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              item.barcode,
              [
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                  value: item.id,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
                  value: item.hrid,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                  value: ITEM_STATUS_NAMES.AVAILABLE,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
                  value: Cypress.env('loanTypes')[0].name,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
                  value: Cypress.env('materialTypes')[0].name,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                  value: false,
                },
              ],
            );

            // Return to bulk edit main page for next iteration
            BulkEditSearchPane.clickToBulkEditMainButton();

            // Clean up files for this iteration immediately
            BulkEditFiles.deleteAllDownloadedFiles(currentFileNames);
          });

          iterationNumber++;
        }
      },
    );
  });
});
