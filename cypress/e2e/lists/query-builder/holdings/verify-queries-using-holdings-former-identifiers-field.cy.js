import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  holdingsFieldValues,
  instanceFieldValues,
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
const instanceTitle = `AT_C844255_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  defaultLocation: {},
  instanceId: null,
  holdingWithFormerIds: {
    id: null,
    hrid: null,
  },
  holdingWithoutFormerIds: {
    id: null,
    hrid: null,
  },
  formerIdentifier1: `${prefix} IdentifierOne - ${randomFourDigitNumber()}`,
  formerIdentifier2: `${prefix} IdentifierTwo - ${randomFourDigitNumber()}`,
  formerIdentifier3: `${prefix} IdentifierThree - ${randomFourDigitNumber()}`,
};
// Combined display value as shown in UI (separated by " | ")
const formerIdentifiersDisplay = `${testData.formerIdentifier1} | ${testData.formerIdentifier2} | ${testData.formerIdentifier3}`;
const listData = {
  name: `AT_C844255_List_${getRandomPostfix()}`,
  description: `AT_C844255_${getTestEntityValue('desc')}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Holdings', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 })
          .then((res) => {
            testData.defaultLocation = res;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                  formerIds: [
                    testData.formerIdentifier1,
                    testData.formerIdentifier2,
                    testData.formerIdentifier3,
                  ],
                },
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                  formerIds: [],
                },
              ],
            });
          })
          .then((createdInstance) => {
            testData.instanceId = createdInstance.instanceId;
            testData.holdingWithFormerIds.id = createdInstance.holdingIds[0].id;
            testData.holdingWithoutFormerIds.id = createdInstance.holdingIds[1].id;

            // Get holding HRIDs
            cy.getHoldings({ query: `"id"="${testData.holdingWithFormerIds.id}"` }).then(
              (holdings) => {
                testData.holdingWithFormerIds.hrid = holdings[0].hrid;
              },
            );
            cy.getHoldings({ query: `"id"="${testData.holdingWithoutFormerIds.id}"` }).then(
              (holdings) => {
                testData.holdingWithoutFormerIds.hrid = holdings[0].hrid;
              },
            );
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
        'C844255 Verify that it\'s possible to run queries using the field "Holdings — Former identifiers" (athena)',
        { tags: ['criticalPath', 'athena', 'C844255'] },
        () => {
          // Step 1: Create new list with Holdings record type and build query
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.holdings);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Add instance title filter for test isolation
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(instanceTitle);
          QueryModal.verifyTextFieldValue(instanceTitle);
          QueryModal.addNewRow();

          // Step 2: Select "Holdings — Former identifiers" field
          QueryModal.selectField(holdingsFieldValues.formerIds, 1);
          QueryModal.verifySelectedField(holdingsFieldValues.formerIds, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids  )`,
          );

          // Step 3: Test with "is null/empty" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids  is null/empty )`,
          );
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids  is null/empty false)`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.clickTestQuery();

          // Step 4: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Show Holdings — Former identifiers column and verify all values are displayed
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.holdingWithFormerIds.hrid,
            holdingsFieldValues.formerIds,
            formerIdentifiersDisplay,
          );
          // Verify holding without former IDs is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.holdingWithoutFormerIds.hrid,
          );

          // Step 5: Test with "Equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.formerIdentifier1, 1);
          QueryModal.verifyTextFieldValue(testData.formerIdentifier1, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids == ${testData.formerIdentifier1})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.holdingWithFormerIds.hrid);

          // Verify Holdings — Former identifiers column shows all values
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.holdingWithFormerIds.hrid,
            holdingsFieldValues.formerIds,
            formerIdentifiersDisplay,
          );
          // Verify holding without former IDs is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.holdingWithoutFormerIds.hrid,
          );

          // Step 6: Test with "Contains" operator
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.fillInValueTextfield(prefix, 1);
          QueryModal.verifyTextFieldValue(prefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids contains ${prefix})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.holdingWithFormerIds.hrid);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.holdingWithFormerIds.hrid,
            holdingsFieldValues.formerIds,
            formerIdentifiersDisplay,
          );
          // Verify holding without former IDs is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.holdingWithoutFormerIds.hrid,
          );

          // Step 7: Test with "Not equal to" operator
          const randomValue = `random${getRandomPostfix()}`;

          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield(randomValue, 1);
          QueryModal.verifyTextFieldValue(randomValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids != ${randomValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // Both holdings should be returned (one with former IDs, one without)
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 8: Test with "Starts with" operator
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield(prefix, 1);
          QueryModal.verifyTextFieldValue(prefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids starts with ${prefix})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.holdingWithFormerIds.hrid);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.holdingWithFormerIds.hrid,
            holdingsFieldValues.formerIds,
            formerIdentifiersDisplay,
          );
          // Verify holding without former IDs is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.holdingWithoutFormerIds.hrid,
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
          QueryModal.verifySelectedField(holdingsFieldValues.formerIds, 1);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.verifyTextFieldValue(prefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title == ${instanceTitle}) AND (holdings.former_ids starts with ${prefix})`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 13: Verify query persists correctly
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyRecordWithContent(testData.holdingWithFormerIds.hrid);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.holdingWithFormerIds.hrid,
            holdingsFieldValues.formerIds,
            formerIdentifiersDisplay,
          );
          // Verify holding without former IDs is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.holdingWithoutFormerIds.hrid,
          );
        },
      );
    });
  });
});
