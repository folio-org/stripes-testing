import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

let user;
const folioInstance = {
  title: `AT_C813672_FolioInstance_${getRandomPostfix()}`,
};
const testHoldingsData = [
  {
    // Holdings 1
    receivingHistory: [
      {
        enumeration: 'v.1, no. 1-12 (no. 1-12) 1977',
        chronology: 'An annual publication identified only by year.',
        publicDisplay: true,
      },
    ],
  },
  {
    // Holdings 2 - multiple receiving history entries
    receivingHistory: [
      {
        enumeration: 'v.1, no. 1-12 (no. 1-12) 1977',
        chronology: '(year)',
        publicDisplay: false,
      },
      {
        enumeration: 'v.2, no. 1-12 (no. 13-24) 1978',
        chronology: '(month)',
        publicDisplay: false,
      },
      {
        enumeration: 'v. 3, no. 1-12 (no. 25-36) 1979',
        chronology: '(day)',
        publicDisplay: true,
      },
    ],
  },
  {
    // Holdings 3
    receivingHistory: [
      {
        enumeration: 'v. 4 no. 1-2 (no. 37-38) Jan.-Feb., 1980',
        chronology: '(season)',
        publicDisplay: false,
      },
    ],
  },
  {
    // Holdings 4 - no receiving history
    receivingHistory: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813672');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get required IDs for instance creation
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            folioInstance.instanceTypeId = instanceTypeData[0].id;
          });

          cy.getLocations({ limit: 1 }).then((locations) => {
            const locationId = locations.id;

            // Create instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: folioInstance.instanceTypeId,
                title: folioInstance.title,
              },
            }).then((createdInstance) => {
              folioInstance.id = createdInstance.instanceId;

              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                const sourceId = folioSource.id;

                // Create holdings with receiving history data
                testHoldingsData.forEach((holdingData, index) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: folioInstance.id,
                    sourceId,
                    permanentLocationId: locationId,
                    receivingHistory: { entries: holdingData.receivingHistory },
                  }).then((createdHolding) => {
                    testHoldingsData[index].id = createdHolding.id;
                    testHoldingsData[index].hrid = createdHolding.hrid;
                  });
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      });

      it(
        'C813672 Search holdings by Receiving history fields (firebird)',
        { tags: ['extendedPath', 'firebird', 'C813672'] },
        () => {
          // Map receiving history data to convert boolean publicDisplay to string format for verification
          const mappedHoldingsDatatoUIView = testHoldingsData.map((holding) => ({
            ...holding,
            receivingHistory: holding.receivingHistory.map((entry) => ({
              ...entry,
              publicDisplay: entry.publicDisplay ? 'True' : 'False',
            })),
          }));

          // Step 1: Verify Receiving history fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.receivingHistoryChronology);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryChronology);
          QueryModal.selectField(holdingsFieldValues.receivingHistoryEnumeration);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryEnumeration);
          QueryModal.selectField(holdingsFieldValues.receivingHistoryPublicDisplay);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryPublicDisplay);
          QueryModal.verifyFieldsSortedAlphabetically();

          // Step 2: Search holdings by "Holdings — Receiving history — Enumeration" field using "equals" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(holdingsFieldValues.receivingHistoryEnumeration);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryEnumeration);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('v.1, no. 1-12 (no. 1-12) 1977');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedHoldingsToFind = [
            mappedHoldingsDatatoUIView[0],
            mappedHoldingsDatatoUIView[1],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            QueryModal.verifyReceivingHistoryEmbeddedTableInQueryModal(
              holding.hrid,
              holding.receivingHistory,
            );
          });

          const notExpectedToFindHoldingHrids = [
            mappedHoldingsDatatoUIView[2].hrid,
            mappedHoldingsDatatoUIView[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search holdings by "Holdings — Receiving history — Chronology" field using "contains" operator
          QueryModal.selectField(holdingsFieldValues.receivingHistoryChronology);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryChronology);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('year');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            QueryModal.verifyReceivingHistoryEmbeddedTableInQueryModal(
              holding.hrid,
              holding.receivingHistory,
            );
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search holdings by "Holdings — Receiving history — Public display" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.receivingHistoryPublicDisplay);
          QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryPublicDisplay);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedHoldingsWithFalseDisplay = [
            mappedHoldingsDatatoUIView[1],
            mappedHoldingsDatatoUIView[2],
          ];

          expectedHoldingsWithFalseDisplay.forEach((holding) => {
            QueryModal.verifyReceivingHistoryEmbeddedTableInQueryModal(
              holding.hrid,
              holding.receivingHistory,
            );
          });

          const notExpectedWithFalseDisplay = [
            mappedHoldingsDatatoUIView[0].hrid,
            mappedHoldingsDatatoUIView[3].hrid,
          ];

          notExpectedWithFalseDisplay.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
