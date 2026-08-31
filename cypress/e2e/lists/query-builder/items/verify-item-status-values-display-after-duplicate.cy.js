import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
const listData = {
  name: `AT_C442830-${getTestEntityValue('list')}`,
  description: `AT_C442830-${getTestEntityValue('desc')}`,
  recordType: 'Items',
};
const itemStatuses = [
  ITEM_STATUS_NAMES.MISSING,
  ITEM_STATUS_NAMES.AGED_TO_LOST,
  ITEM_STATUS_NAMES.CLAIMED_RETURNED,
  ITEM_STATUS_NAMES.DECLARED_LOST,
  ITEM_STATUS_NAMES.LONG_MISSING,
];
const cannedListDuplicateName = 'Missing items - copy';
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  items: [],
  itemBarcodes: {
    missing: `item1_${getRandomPostfix()}`,
    agedToLost: `item2_${getRandomPostfix()}`,
    claimedReturned: `item3_${getRandomPostfix()}`,
    declaredLost: `item4_${getRandomPostfix()}`,
    longMissing: `item5_${getRandomPostfix()}`,
    available1: `item6_${getRandomPostfix()}`,
    available2: `item7_${getRandomPostfix()}`,
  },
};
const instanceData = {
  title: `AT_C442830_Instance_${getRandomPostfix()}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.defaultLocation = res;
        });
        cy.createLoanType({
          name: getTestEntityValue('loanType'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType()
          .then((materialType) => {
            testData.materialTypeId = materialType.id;
          })
          .then(() => {
            // Create instance with 5 items with different statuses
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceData.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  barcode: testData.itemBarcodes.missing,
                  status: { name: ITEM_STATUS_NAMES.MISSING },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.agedToLost,
                  status: { name: ITEM_STATUS_NAMES.AGED_TO_LOST },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.claimedReturned,
                  status: { name: ITEM_STATUS_NAMES.CLAIMED_RETURNED },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.declaredLost,
                  status: { name: ITEM_STATUS_NAMES.DECLARED_LOST },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.longMissing,
                  status: { name: ITEM_STATUS_NAMES.LONG_MISSING },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.available1,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  barcode: testData.itemBarcodes.available2,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
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
        Lists.deleteListByNameViaApi(cannedListDuplicateName);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        "C442830 Existing 'Item status' values correctly displays in the Query Builder after duplicating not-canned and canned lists (athena)",
        { tags: ['criticalPath', 'athena', 'C442830'] },
        () => {
          // Step 1: Create new list with Items record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Build query
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "Item — Status" field
          QueryModal.selectField(itemFieldValues.itemStatus);
          QueryModal.verifySelectedField(itemFieldValues.itemStatus);
          QueryModal.verifyQueryAreaContent('');

          // Step 4: Select "IN" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(items.status_name in ())');

          // Step 5: Select multiple item status values
          itemStatuses.forEach((status) => {
            QueryModal.chooseFromValueMultiselect(status);
          });
          QueryModal.verifySelectedMultiselectValue(itemStatuses);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Add AND condition
          QueryModal.addNewRow();
          QueryModal.verifyQueryAreaContent(`(items.status_name in [${itemStatuses.join(', ')}])`);

          // Select Instance title field
          QueryModal.selectField(itemFieldValues.instanceTitle, 1);
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle, 1);

          // Select == operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);

          // Enter instance title value
          QueryModal.fillInValueTextfield(instanceData.title, 1);
          QueryModal.verifyTextFieldValue(instanceData.title, 1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 6: Test query
          QueryModal.testQuery();

          // Step 7: Verify preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          // Step 8: Run query and save
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();

          // Step 9: Verify compilation complete
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.verifyRefreshCompleteCallout(5);
          Lists.waitForCompilingToComplete();

          // Step 10: View updated list
          Lists.verifyListNameLabel(listData.name);
          Lists.verifyRecordsNumber(5);

          // Verify each returned item has the correct status
          Lists.openActions();
          Lists.selectResultColumn(itemFieldValues.itemBarcode);
          Lists.verifyResultCellByIdentifier(
            testData.itemBarcodes.missing,
            itemFieldValues.itemStatus,
            ITEM_STATUS_NAMES.MISSING,
          );
          Lists.verifyResultCellByIdentifier(
            testData.itemBarcodes.agedToLost,
            itemFieldValues.itemStatus,
            ITEM_STATUS_NAMES.AGED_TO_LOST,
          );
          Lists.verifyResultCellByIdentifier(
            testData.itemBarcodes.claimedReturned,
            itemFieldValues.itemStatus,
            ITEM_STATUS_NAMES.CLAIMED_RETURNED,
          );
          Lists.verifyResultCellByIdentifier(
            testData.itemBarcodes.declaredLost,
            itemFieldValues.itemStatus,
            ITEM_STATUS_NAMES.DECLARED_LOST,
          );
          Lists.verifyResultCellByIdentifier(
            testData.itemBarcodes.longMissing,
            itemFieldValues.itemStatus,
            ITEM_STATUS_NAMES.LONG_MISSING,
          );
          Lists.openActions();

          // Step 11: Open Actions menu
          Lists.openActions();
          Lists.verifyRefreshListButtonIsActive();
          Lists.verifyEditListButtonIsActive();
          Lists.verifyDuplicateListButtonIsActive();
          Lists.verifyEditListButtonIsActive();
          Lists.verifyExportListVisibleColumnsButtonIsActive();
          Lists.verifyExportListButtonIsActive();

          // Step 12: Duplicate list
          Lists.duplicateList();
          Lists.verifyListName(listData.name + ' - copy');
          Lists.verifyVisibility('Shared', true);
          Lists.verifyStatus('Active', true);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 13: Edit query on duplicated list and verify values
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();
          QueryModal.verifyQueryAreaContent(
            `(items.status_name in [${itemStatuses.join(', ')}]) AND (instances.title == ${instanceData.title})`,
          );
          QueryModal.verifySelectedField(itemFieldValues.itemStatus);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue(itemStatuses);
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyTextFieldValue(instanceData.title, 1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.cancelDisabled(false);

          // Step 14: Open "Missing items" canned list
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
          Lists.waitLoading();
          Lists.openMissingItemsList();
          Lists.verifyListNameLabel('Missing items');
          Lists.verifyQuery(`items.status_name in [${itemStatuses.join(', ')}]`);
          // Wait for list to compile and load records
          Lists.waitForCompilingToComplete();

          // Step 15: Open Actions menu
          Lists.getNumberOfFoundRecordsFromPaneHeader('Missing items').then((recordsCount) => {
            Lists.verifyRecordsNumber(recordsCount === 0 ? 'No' : recordsCount);

            Lists.openActions();
            Lists.verifyRefreshListButtonIsActive();
            Lists.verifyEditListButtonIsDisabled();
            Lists.verifyDuplicateListButtonIsActive();
            Lists.verifyDeleteListButtonIsDisabled();

            if (recordsCount > 0) {
              Lists.verifyExportListVisibleColumnsButtonIsActive();
              Lists.verifyExportListButtonIsActive();
            } else {
              Lists.verifyExportListVisibleColumnsButtonIsDisabled();
              Lists.verifyExportListButtonIsDisabled();
            }
          });

          // Step 16: Duplicate canned list
          Lists.duplicateList();
          Lists.verifyListName(cannedListDuplicateName);
          Lists.verifyListDescription(
            'Returns all items with a status of: missing, aged to lost, claimed returned, declared lost, long missing',
          );
          Lists.verifyVisibility('Shared', true);
          Lists.verifyStatus('Active', true);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 17: Edit query on duplicated canned list and verify values
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.xButttonDisabled(false);
          QueryModal.verifySelectedField(itemFieldValues.itemStatus);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue(itemStatuses);
          QueryModal.verifyQueryAreaContent(`(items.status_name in [${itemStatuses.join(', ')}])`);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
        },
      );
    });
  });
});
