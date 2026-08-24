import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';

let user;
const instanceTitle = `AT_C844256_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  instanceId: null,
  item1Barcode: `item1_${getRandomPostfix()}`,
  item2Barcode: `item2_${getRandomPostfix()}`,
  item3Barcode: `item3_${getRandomPostfix()}`,
  yearCaption1: ['2025', 'April 17', 'Biweekly'],
  yearCaption2: ['v. 12 1993'],
};
// Combined display value as shown in UI (separated by " | ")
const yearCaptionDisplay = testData.yearCaption1.join(' | ');
const yearCaption2Display = testData.yearCaption2.join(' | ');
const listData = {
  name: `AT_C844256_List_${getRandomPostfix()}`,
  description: `AT_C844256_${getTestEntityValue('desc')}`,
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
              items: [
                {
                  barcode: testData.item1Barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  yearCaption: testData.yearCaption1,
                },
                {
                  barcode: testData.item2Barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  yearCaption: testData.yearCaption2,
                },
                {
                  barcode: testData.item3Barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  yearCaption: [],
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C844256 Verify that it\'s possible to run queries using the field "Items—Year, caption" (athena)',
        { tags: ['extendedPath', 'athena', 'C844256'] },
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

          // Step 2: Select "Item — Year, caption" field
          QueryModal.selectField(itemFieldValues.yearCaption);
          QueryModal.verifySelectedField(itemFieldValues.yearCaption);
          QueryModal.verifyQueryAreaContent('');
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 3: Test with "Equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('April 17');
          QueryModal.verifyTextFieldValue('April 17');

          // Add AND condition to scope to specific instance
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.instanceTitle, 1);
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(instanceTitle, 1);
          QueryModal.verifyTextFieldValue(instanceTitle, 1);

          QueryModal.verifyQueryAreaContent(
            `(items.year_caption == April 17) AND (instances.title == ${instanceTitle})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.clickShowColumnsButton();
          QueryModal.selectCheckboxInShowColumns(itemFieldValues.itemBarcode);
          QueryModal.verifyRecordWithContent(testData.item1Barcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item1Barcode,
            itemFieldValues.yearCaption,
            yearCaptionDisplay,
          );

          // Verify other items are not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item2Barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item3Barcode);

          // Step 4: Test with "Contains" operator
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('week');
          QueryModal.verifyTextFieldValue('week');
          QueryModal.verifyQueryAreaContent(
            `(items.year_caption contains week) AND (instances.title == ${instanceTitle})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(testData.item1Barcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item1Barcode,
            itemFieldValues.yearCaption,
            yearCaptionDisplay,
          );

          // Verify other items are not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item2Barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item3Barcode);

          // Step 5: Test with "Not equal to" operator
          const randomValue = `${getRandomPostfix()}`;
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInValueTextfield(randomValue);
          QueryModal.verifyTextFieldValue(randomValue);
          QueryModal.verifyQueryAreaContent(
            `(items.year_caption != ${randomValue}) AND (instances.title == ${instanceTitle})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item1Barcode,
            itemFieldValues.yearCaption,
            yearCaptionDisplay,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item2Barcode,
            itemFieldValues.yearCaption,
            yearCaption2Display,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item3Barcode,
            itemFieldValues.yearCaption,
            '',
          );

          // Step 6: Test with "Starts with" operator
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('20');
          QueryModal.verifyTextFieldValue('20');
          QueryModal.verifyQueryAreaContent(
            `(items.year_caption starts with 20) AND (instances.title == ${instanceTitle})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(testData.item1Barcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item1Barcode,
            itemFieldValues.yearCaption,
            yearCaptionDisplay,
          );

          // Verify other items are not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item2Barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.item3Barcode);

          // Step 7: Save the list
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();

          // Step 8: Verify compilation complete
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();

          // Step 9: View updated list
          Lists.verifyListNameLabel(listData.name);
          Lists.verifySingleRecordNumber();

          // Step 10: Edit the saved list
          Lists.openActions();
          Lists.verifyEditListButtonIsActive();
          Lists.editList();
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.verifySelectedField(itemFieldValues.yearCaption);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH);
          QueryModal.verifyTextFieldValue('20');
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyTextFieldValue(instanceTitle, 1);
          QueryModal.verifyQueryAreaContent(
            `(items.year_caption starts with 20) AND (instances.title == ${instanceTitle})`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 11: Verify query persists correctly
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(testData.item1Barcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.item1Barcode,
            itemFieldValues.yearCaption,
            yearCaptionDisplay,
          );
        },
      );
    });
  });
});
