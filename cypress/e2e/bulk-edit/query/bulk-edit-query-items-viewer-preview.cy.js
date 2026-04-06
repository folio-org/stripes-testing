import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceId;
let holdingId;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const instanceTitle = `AT_C378103_FolioInstance_${getRandomPostfix()}`;
const itemsCount = 105;
const items = [];
const invalidInstanceUuid = uuid();

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instanceTitle,
            },
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              holdingId = holding.id;

              const itemsToCreate = Array.from({ length: itemsCount }, (_, i) => ({
                barcode: `barcode_${i + 1}_${getRandomPostfix()}`,
                index: i,
              }));

              cy.wrap(itemsToCreate)
                .each((itemToCreate) => {
                  InventoryItems.createItemViaApi({
                    barcode: itemToCreate.barcode,
                    holdingsRecordId: holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    items.push({
                      uuid: item.id,
                      barcode: itemToCreate.barcode,
                    });
                  });
                })
                .then(() => {
                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                });
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      items.forEach((item) => {
        InventoryItems.deleteItemViaApi(item.uuid);
      });

      InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C378103 Query builder: Verify "Viewer - preview top 100 records" elements (firebird)',
      { tags: ['extendedPath', 'firebird', 'C378103'] },
      () => {
        // Step 1: Select "Items" radio button under "Record types" accordion => Click "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        // Step 2: Build the query to retrieve at least one but no more than 100 records => Click "Test query" button
        const selectedBarcode = items[0].barcode;

        QueryModal.selectField(itemFieldValues.itemBarcode);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(selectedBarcode);
        QueryModal.clickTestQuery();

        // Step 3: Verify "Preview of the matched records" elements once the query completes
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);

        // Step 4: Scroll down and up the table of matched records => Verify the number of records
        QueryModal.verifyNumberOfRowsInPreviewTable(1);

        // Step 5: Click "Show columns" button to expand all available columns => Verify displayed columns are selected
        QueryModal.clickShowColumnsButton();
        QueryModal.verifyCheckedCheckboxesPresentInTheTable();

        // Step 6: Click "Show columns" button again to collapse the list
        QueryModal.clickShowColumnsButton();
        QueryModal.verifyShowColumnsMenuDisplayed(false);

        // Step 7: Build the query to retrieve more than 100 records => Click "Test query" button => Verify preview elements
        QueryModal.selectField(itemFieldValues.instanceId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(instanceId);

        cy.intercept('GET', '/query/**').as('queryCompleted');
        QueryModal.clickTestQuery();

        // Step 9: Check "Network" tab in DevTools => Find GET request with includeResults=true&offset=0&limit=100
        cy.wait('@queryCompleted').then((interception) => {
          expect(interception.request.url).to.include('includeResults=true');
          expect(interception.request.url).to.include('offset=0');
          expect(interception.request.url).to.include('limit=100');
          expect(interception.response.body.content).to.have.length(100);
        });

        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(itemsCount);

        // Step 8: Scroll down and up the table of matched records => Verify the number of records included
        QueryModal.verifyNumberOfRowsInPreviewTable(100);
        QueryModal.scrollResultTable('bottom');
        QueryModal.scrollResultTable('top');

        // Step 10: Click "Show columns" button => Check/uncheck columns => Verify changes displayed in table
        QueryModal.clickShowColumnsButton();
        QueryModal.clickCheckboxInShowColumns(itemFieldValues.itemBarcode);
        QueryModal.verifyColumnDisplayed(itemFieldValues.itemBarcode, false);
        QueryModal.clickCheckboxInShowColumns('Item — Check in notes');
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed('Item — Check in notes', true);

        // Step 11: Build the query to retrieve no records => Click "Test query" button
        QueryModal.selectField(itemFieldValues.instanceId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(invalidInstanceUuid);
        QueryModal.clickTestQuery();

        // Step 12: Verify "Preview of the matched records" elements once the query completes (0 records)
        QueryModal.verifyNumberOfMatchedRecords(0);
        QueryModal.verifyResultsTableAbsent();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();
      },
    );
  });
});
