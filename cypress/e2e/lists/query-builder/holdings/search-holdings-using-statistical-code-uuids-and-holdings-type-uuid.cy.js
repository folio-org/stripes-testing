import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  stringStoresUuidButMillionOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1453710';
const listName = 'AT_C1453710_Holdings_by_UUID';

const testData = {
  instanceTitle: `AT_${testCaseId}_Instance_${getRandomPostfix()}`,
  instanceTypeId: null,
  locationId: null,
  holdingsSourceId: null,
  instanceId: null,
  holdingsType1: { id: null, name: `AT_${testCaseId}_HoldingsType1_${getRandomPostfix()}` },
  holdingsType2: { id: null, name: `AT_${testCaseId}_HoldingsType2_${getRandomPostfix()}` },
  statCodeA: { id: null },
  statCodeB: { id: null },
  holdings1: { id: null, hrid: null },
  holdings2: { id: null, hrid: null },
  holdings3: { id: null, hrid: null },
  holdings4: { id: null, hrid: null },
};

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Holdings', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`AT_${testCaseId}`);

        // Get instance type and location
        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });
        cy.getLocations({ limit: 1 }).then((loc) => {
          testData.locationId = loc.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((source) => {
          testData.holdingsSourceId = source.id;
        });

        // Get two existing statistical codes
        cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
          testData.statCodeA.id = codes[0].id;
          testData.statCodeB.id = codes[1].id;
        });

        cy.then(() => {
          cy.getHoldingTypes({ limit: 2 }).then((holdingTypes) => {
            testData.holdingsType1.id = holdingTypes[0].id;
            testData.holdingsType2.id = holdingTypes[1].id;
          });
        });

        cy.then(() => {
          // Create parent instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;

            // Holdings 1: HoldingsType1 + StatCodeA
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              holdingsTypeId: testData.holdingsType1.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.holdingsSourceId,
              statisticalCodeIds: [testData.statCodeA.id],
            }).then((h) => {
              testData.holdings1.id = h.id;
              testData.holdings1.hrid = h.hrid;
            });

            // Holdings 2: HoldingsType1 + StatCodeB
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              holdingsTypeId: testData.holdingsType1.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.holdingsSourceId,
              statisticalCodeIds: [testData.statCodeB.id],
            }).then((h) => {
              testData.holdings2.id = h.id;
              testData.holdings2.hrid = h.hrid;
            });

            // Holdings 3: HoldingsType2 + StatCodeA + StatCodeB
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              holdingsTypeId: testData.holdingsType2.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.holdingsSourceId,
              statisticalCodeIds: [testData.statCodeA.id, testData.statCodeB.id],
            }).then((h) => {
              testData.holdings3.id = h.id;
              testData.holdings3.hrid = h.hrid;
            });

            // Holdings 4: HoldingsType2 + no statistical codes
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              holdingsTypeId: testData.holdingsType2.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.holdingsSourceId,
              statisticalCodeIds: [],
            }).then((h) => {
              testData.holdings4.id = h.id;
              testData.holdings4.hrid = h.hrid;
            });
          });
        });

        cy.then(() => {
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
        Lists.deleteListByNameViaApi(listName);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1453710 User can build and save a Holdings list queried by statistical code UUIDs and holdings type UUID (athena)',
        { tags: ['extendedPath', 'athena', 'C1453710'] },
        () => {
          // Step 1: Create new list with Holdings record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.holdings);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query" button and verify form elements
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "Holdings — Statistical code UUIDs" field, "equals" operator, add StatCode-A UUID and test query
          QueryModal.selectField(holdingsFieldValues.holdingsStatisticalCodeUuids);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsStatisticalCodeUuids);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.fillInValueTextfield(testData.statCodeA.id);
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.instanceId, 1);
          QueryModal.testQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.statistical_code_ids == ${testData.statCodeA.id}) AND (holdings.instance_id == ${testData.instanceId})`,
          );
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          // Holdings 1 and Holdings 3 match; Holdings 2 and Holdings 4 do not
          QueryModal.verifyResultFound(testData.holdings1.hrid);
          QueryModal.verifyResultFound(testData.holdings3.hrid);
          QueryModal.verifyResultFound(testData.holdings2.hrid, { isFound: false });
          QueryModal.verifyResultFound(testData.holdings4.hrid, { isFound: false });

          // Step 4: Change operator to "not equal to", keep StatCode-A UUID and test query
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.testQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.statistical_code_ids != ${testData.statCodeA.id}) AND (holdings.instance_id == ${testData.instanceId})`,
          );
          // Holdings 2 and Holdings 4 match; Holdings 1 and Holdings 3 do not
          QueryModal.verifyResultFound(testData.holdings2.hrid);
          QueryModal.verifyResultFound(testData.holdings4.hrid);
          QueryModal.verifyResultFound(testData.holdings1.hrid, { isFound: false });
          QueryModal.verifyResultFound(testData.holdings3.hrid, { isFound: false });

          // Step 5: Change operator to "is null/empty", select "False" and test query
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('False');
          QueryModal.testQuery();
          // Holdings 1, 2, 3 have statistical codes (not null/empty); Holdings 4 has none
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultFound(testData.holdings1.hrid);
          QueryModal.verifyResultFound(testData.holdings2.hrid);
          QueryModal.verifyResultFound(testData.holdings3.hrid);
          QueryModal.verifyResultFound(testData.holdings4.hrid, { isFound: false });

          // Step 6: Verify "Holdings — Statistical code UUIDs" column values
          QueryModal.verifyColumnValueForRow(
            testData.holdings1.hrid,
            holdingsFieldValues.holdingsStatisticalCodeUuids,
            testData.statCodeA.id,
          );
          QueryModal.verifyColumnValueForRow(
            testData.holdings2.hrid,
            holdingsFieldValues.holdingsStatisticalCodeUuids,
            testData.statCodeB.id,
          );
          QueryModal.verifyColumnValueForRow(
            testData.holdings3.hrid,
            holdingsFieldValues.holdingsStatisticalCodeUuids,
            `${testData.statCodeA.id} | ${testData.statCodeB.id}`,
          );

          // Step 7: Change field to "Holdings type — Type UUID", "equals", enter HoldingsType1 UUID and test query
          QueryModal.selectField(holdingsFieldValues.holdingsTypeUuid);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsTypeUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
          QueryModal.fillInValueTextfield(testData.holdingsType1.id);
          QueryModal.testQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings_type.id == ${testData.holdingsType1.id}) AND (holdings.instance_id == ${testData.instanceId})`,
          );
          // Holdings 1 and Holdings 2 match; Holdings 3 and Holdings 4 do not
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultFound(testData.holdings1.hrid);
          QueryModal.verifyResultFound(testData.holdings2.hrid);
          QueryModal.verifyResultFound(testData.holdings3.hrid, { isFound: false });
          QueryModal.verifyResultFound(testData.holdings4.hrid, { isFound: false });

          // Step 8: Change operator to "in", add HoldingsType2 UUID (comma-separated) and test query
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(
            `${testData.holdingsType1.id},${testData.holdingsType2.id}`,
          );
          QueryModal.testQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings_type.id in (${testData.holdingsType1.id}, ${testData.holdingsType2.id})) AND (holdings.instance_id == ${testData.instanceId})`,
          );
          // All 4 holdings match
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyResultFound(testData.holdings1.hrid);
          QueryModal.verifyResultFound(testData.holdings2.hrid);
          QueryModal.verifyResultFound(testData.holdings3.hrid);
          QueryModal.verifyResultFound(testData.holdings4.hrid);

          // Step 9: Verify "Holdings type — Type UUID" column values
          QueryModal.verifyColumnValueForRow(
            testData.holdings1.hrid,
            holdingsFieldValues.holdingsTypeUuid,
            testData.holdingsType1.id,
          );
          QueryModal.verifyColumnValueForRow(
            testData.holdings2.hrid,
            holdingsFieldValues.holdingsTypeUuid,
            testData.holdingsType1.id,
          );
          QueryModal.verifyColumnValueForRow(
            testData.holdings3.hrid,
            holdingsFieldValues.holdingsTypeUuid,
            testData.holdingsType2.id,
          );
          QueryModal.verifyColumnValueForRow(
            testData.holdings4.hrid,
            holdingsFieldValues.holdingsTypeUuid,
            testData.holdingsType2.id,
          );

          // Step 10: Change to "equals" HoldingsType1, add second row with Statistical code UUIDs "is null/empty" = True
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.holdingsType1.id);
          QueryModal.addNewRow(1);
          QueryModal.selectField(holdingsFieldValues.holdingsStatisticalCodeUuids, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.chooseValueSelect('True', 2);
          QueryModal.testQuery();
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(2, false, false);
          QueryModal.verifyQueryAreaContent(
            `(holdings_type.id == ${testData.holdingsType1.id}) AND (holdings.instance_id == ${testData.instanceId}) AND (holdings.statistical_code_ids  is null/empty true)`,
          );
          // HoldingsType1 holdings (1 & 2) both have stat codes — no results
          QueryModal.verifyQueryReturnsNoResults();
          QueryModal.runQueryDisabled(false);

          // Step 11: Change HoldingsType1 UUID to HoldingsType2 UUID and test query
          QueryModal.fillInValueTextfield(testData.holdingsType2.id);
          QueryModal.testQuery();
          // Only Holdings 4 (HoldingsType2 + no statistical codes) matches
          QueryModal.verifyResultFound(testData.holdings4.hrid);
          QueryModal.verifyResultFound(testData.holdings1.hrid, { isFound: false });
          QueryModal.verifyResultFound(testData.holdings2.hrid, { isFound: false });
          QueryModal.verifyResultFound(testData.holdings3.hrid, { isFound: false });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 12: Click "Run query & save" and verify list details page
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingToComplete();
          Lists.verifyQuery(
            `holdings_type.id == ${testData.holdingsType2.id}) AND (holdings.instance_id == ${testData.instanceId}) AND (holdings.statistical_code_ids is null/empty true`,
          );

          // Step 13: Open Actions => "Edit list", click "Edit query" and verify saved conditions
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsTypeUuid, 0);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 0);
          QueryModal.verifyTextFieldValue(testData.holdingsType2.id, 0);
          QueryModal.verifySelectedField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyTextFieldValue(testData.instanceId, 1);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsStatisticalCodeUuids, 2);
          QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`, 2);
          QueryModal.verifySelectedValue('True', 2);
          QueryModal.verifyQueryAreaContent(
            `(holdings_type.id == ${testData.holdingsType2.id}) AND (holdings.instance_id == ${testData.instanceId}) AND (holdings.statistical_code_ids  is null/empty true)`,
          );
        },
      );
    });
  });
});
