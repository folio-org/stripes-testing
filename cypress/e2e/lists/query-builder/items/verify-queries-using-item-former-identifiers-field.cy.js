import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getTestEntityValue,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

let user;
const prefix = String(randomFourDigitNumber());
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  instanceId: null,
  holdingId: null,
  itemId: null,
  itemBarcode: `item_${getRandomPostfix()}`,
  formerIdentifier1: `${prefix} Item1 - ${randomFourDigitNumber()}`,
  formerIdentifier2: `${prefix} Item2 - ${randomFourDigitNumber()}`,
  formerIdentifier3: `${prefix} Item3 - ${randomFourDigitNumber()}`,
};
// Combined display value as shown in UI (separated by " | ")
const formerIdentifiersDisplay = `${testData.formerIdentifier1} | ${testData.formerIdentifier2} | ${testData.formerIdentifier3}`;
const listData = {
  name: `AT_C844252_List_${getRandomPostfix()}`,
  description: `AT_C844252_${getTestEntityValue('desc')}`,
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
                title: `AT_C844252_Instance_${getRandomPostfix()}`,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  barcode: testData.itemBarcode,
                  status: { name: 'Available' },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  formerIds: [
                    testData.formerIdentifier1,
                    testData.formerIdentifier2,
                    testData.formerIdentifier3,
                  ],
                },
              ],
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
              testData.holdingId = createdInstance.holdingIds[0].id;
              testData.itemId = createdInstance.holdingIds[0].itemIds[0];
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
        'C844252 Verify that it\'s possible to run queries using the field "Item — Former identifiers" (athena)',
        { tags: ['criticalPath', 'athena', 'C844252'] },
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

          // Step 2: Select "Item — Former identifiers" field
          QueryModal.selectField(itemFieldValues.itemFormerIdentifiers);
          QueryModal.verifySelectedField(itemFieldValues.itemFormerIdentifiers);
          QueryModal.verifyQueryAreaContent('(items.former_ids  )');
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 3: Test with "is null/empty" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`);
          QueryModal.verifyQueryAreaContent('(items.former_ids  is null/empty )');
          QueryModal.selectValueFromSelect('False');
          QueryModal.verifyQueryAreaContent('(items.former_ids  is null/empty false)');
          QueryModal.testQueryDisabled(false);
          QueryModal.clickTestQuery();

          // Step 4: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Show Item — Former identifiers column and verify all values are displayed
          QueryModal.clickShowColumnsButton();
          QueryModal.selectCheckboxInShowColumns(itemFieldValues.itemBarcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcode,
            itemFieldValues.itemFormerIdentifiers,
            formerIdentifiersDisplay,
          );

          // Step 5: Test with "Equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.formerIdentifier1);
          QueryModal.verifyTextFieldValue(testData.formerIdentifier1);
          QueryModal.verifyQueryAreaContent(`(items.former_ids == ${testData.formerIdentifier1})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.itemBarcode);

          // Verify Item — Former identifiers column shows all values
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcode,
            itemFieldValues.itemFormerIdentifiers,
            formerIdentifiersDisplay,
          );

          // Step 6: Test with "Contains" operator
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield(prefix);
          QueryModal.verifyTextFieldValue(prefix);
          QueryModal.verifyQueryAreaContent(`(items.former_ids contains ${prefix})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(testData.itemBarcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcode,
            itemFieldValues.itemFormerIdentifiers,
            formerIdentifiersDisplay,
          );

          // Step 7: Test with "Not equal to" operator
          const randomValue = `random${getRandomPostfix()}`;

          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInValueTextfield(randomValue);
          QueryModal.verifyTextFieldValue(randomValue);
          QueryModal.verifyQueryAreaContent(`(items.former_ids != ${randomValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 8: Test with "Starts with" operator
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield(prefix);
          QueryModal.verifyTextFieldValue(prefix);
          QueryModal.verifyQueryAreaContent(`(items.former_ids starts with ${prefix})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(testData.itemBarcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcode,
            itemFieldValues.itemFormerIdentifiers,
            formerIdentifiersDisplay,
          );

          // Step 9: Save the list
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();

          // Step 10: Verify compilation complete
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();

          // Step 11: View updated list
          Lists.verifyListNameLabel(listData.name);
          Lists.verifySingleRecordNumber();

          // Step 12: Edit the saved list
          Lists.openActions();
          Lists.verifyEditListButtonIsActive();
          Lists.editList();
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.verifySelectedField(itemFieldValues.itemFormerIdentifiers);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH);
          QueryModal.verifyTextFieldValue(prefix);
          QueryModal.verifyQueryAreaContent(`(items.former_ids starts with ${prefix})`);
          QueryModal.testQueryDisabled(false);

          // Step 13: Verify query persists correctly
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.itemBarcode);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcode,
            itemFieldValues.itemFormerIdentifiers,
            formerIdentifiersDisplay,
          );
        },
      );
    });
  });
});
