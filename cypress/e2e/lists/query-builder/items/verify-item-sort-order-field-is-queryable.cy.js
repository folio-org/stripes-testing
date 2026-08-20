import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';

let user;
const instanceTitle = `AT_C852051_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  instanceId: null,
  holdingsId: null,
  itemBarcodes: [
    `item1_${getRandomPostfix()}`,
    `item2_${getRandomPostfix()}`,
    `item3_${getRandomPostfix()}`,
    `item4_${getRandomPostfix()}`,
    `item5_${getRandomPostfix()}`,
  ],
  orderValues: [1, 2, 3, 4, 5],
};
const listData = {
  name: `AT_C852051_List_${getRandomPostfix()}`,
  description: `AT_C852051_${getTestEntityValue('desc')}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C852051');

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.defaultLocation = res;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getDefaultMaterialType()
          .then((materialType) => {
            testData.materialTypeId = materialType.id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
              testData.holdingsId = createdInstance.holdingIds[0].id;

              // Create 5 items with order values 1, 2, 3, 4, 5
              testData.orderValues.forEach((orderValue, index) => {
                cy.createItem({
                  barcode: testData.itemBarcodes[index],
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  holdingsRecordId: testData.holdingsId,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  order: orderValue,
                });
              });
            });
          })
          .then(() => {
            cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
              (userProperties) => {
                user = userProperties;

                cy.login(user.username, user.password, {
                  path: TopMenu.listsPath,
                  waiter: Lists.waitLoading,
                });
              },
            );
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C852051 Verify that "Item - Order" field is queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C852051'] },
        () => {
          // Step 1: Create new list with Items record type and build query
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Add instance title filter for test isolation
          QueryModal.selectField(itemFieldValues.instanceTitle);
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(instanceTitle);
          QueryModal.verifyTextFieldValue(instanceTitle);

          // Add new row for sort order field
          QueryModal.addNewRow();

          // Step 2: Query by "Item — Sort order" with "is null/empty" = TRUE
          QueryModal.selectField(itemFieldValues.itemSortOrder, 1);
          QueryModal.verifySelectedField(itemFieldValues.itemSortOrder, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.verifySelectedValue('True', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyQueryReturnsNoResults();

          // Step 3: Change to FALSE
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.verifySelectedValue('False', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          QueryModal.clickShowColumnsButton();
          QueryModal.selectCheckboxInShowColumns(itemFieldValues.itemBarcode);

          testData.itemBarcodes.forEach((barcode, index) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              barcode,
              itemFieldValues.itemSortOrder,
              testData.orderValues[index].toString(),
            );
          });

          // Step 4: Change operator to "Equals", value "3"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield('3', 1);
          QueryModal.verifyTextFieldValue('3', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          const expectedItemsEquals3 = [{ barcode: testData.itemBarcodes[2], order: '3' }];
          const notExpectedItemsEquals3 = [
            testData.itemBarcodes[0],
            testData.itemBarcodes[1],
            testData.itemBarcodes[3],
            testData.itemBarcodes[4],
          ];

          expectedItemsEquals3.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemSortOrder,
              item.order,
            );
          });

          notExpectedItemsEquals3.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 5: Change operator to "greater than", value "2"
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.GREATER_THAN, 1);
          QueryModal.fillInValueTextfield('2', 1);
          QueryModal.verifyTextFieldValue('2', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);

          const expectedItemsGreaterThan2 = [
            { barcode: testData.itemBarcodes[2], order: '3' },
            { barcode: testData.itemBarcodes[3], order: '4' },
            { barcode: testData.itemBarcodes[4], order: '5' },
          ];
          const notExpectedItemsGreaterThan2 = [testData.itemBarcodes[0], testData.itemBarcodes[1]];

          expectedItemsGreaterThan2.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemSortOrder,
              item.order,
            );
          });

          notExpectedItemsGreaterThan2.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 6: Change operator to "less than or equal to", value "2"
          QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN_OR_EQUAL_TO, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.LESS_THAN_OR_EQUAL_TO, 1);
          QueryModal.fillInValueTextfield('2', 1);
          QueryModal.verifyTextFieldValue('2', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          const expectedItemsLessThanOrEqual2 = [
            { barcode: testData.itemBarcodes[0], order: '1' },
            { barcode: testData.itemBarcodes[1], order: '2' },
          ];
          const notExpectedItemsLessThanOrEqual2 = [
            testData.itemBarcodes[2],
            testData.itemBarcodes[3],
            testData.itemBarcodes[4],
          ];

          expectedItemsLessThanOrEqual2.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemSortOrder,
              item.order,
            );
          });

          notExpectedItemsLessThanOrEqual2.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 7: Run query & save
          QueryModal.verifyQueryAreaContent(
            `(instances.title == ${instanceTitle}) AND (items.order <= 2)`,
          );
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();

          // Edit list and verify query is persisted
          Lists.verifyListNameLabel(listData.name);
          Lists.openActions();
          Lists.verifyEditListButtonIsActive();
          Lists.editList();
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.verifyQueryAreaContent(
            `(instances.title == ${instanceTitle}) AND (items.order <= 2)`,
          );

          // Verify all fields are pre-populated
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyTextFieldValue(instanceTitle);

          QueryModal.verifySelectedField(itemFieldValues.itemSortOrder, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.LESS_THAN_OR_EQUAL_TO, 1);
          QueryModal.verifyTextFieldValue('2', 1);

          QueryModal.testQueryDisabled(false);

          // Test query and verify results persist
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          const finalExpectedItems = [
            { barcode: testData.itemBarcodes[0], order: '1' },
            { barcode: testData.itemBarcodes[1], order: '2' },
          ];

          finalExpectedItems.forEach((item) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemSortOrder,
              item.order,
            );
          });
        },
      );
    });
  });
});
