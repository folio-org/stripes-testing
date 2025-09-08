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

let user;
const folioInstance = {
  title: `AT_C825265_FolioInstance_${getRandomPostfix()}`,
};
const expectedHoldings = [
  {
    formerIds: ['hold001'],
  },
  {
    formerIds: ['hold002', 'ho003', 'h004'],
  },
  {
    formerIds: ['hol005'],
  },
  {
    formerIds: [],
  },
];

// Helper function to verify former IDs display
const verifyFormerIds = (holding) => {
  if (holding.formerIds && holding.formerIds.length > 0) {
    const formerIdsText = Array.isArray(holding.formerIds)
      ? holding.formerIds.join(' | ')
      : holding.formerIds;
    QueryModal.verifyMatchedRecordsByIdentifier(
      holding.hrid,
      holdingsFieldValues.formerIds,
      formerIdsText,
    );
  }
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825265');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get instance type ID
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Get holding type ID
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              const holdingTypeId = holdingTypes[0].id;

              // Get default location
              cy.getLocations({ limit: 1 }).then((locations) => {
                const locationId = locations.id;

                // Generate holdings with required fields and former IDs
                const holdingsWithRequiredFields = expectedHoldings.map((holding) => ({
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                  formerIds: holding.formerIds,
                }));

                // Create instance with holdings
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                  holdings: holdingsWithRequiredFields,
                }).then((createdInstanceData) => {
                  folioInstance.id = createdInstanceData.instanceId;

                  createdInstanceData.holdingIds.forEach((holdingId, index) => {
                    cy.getHoldings({ query: `"id"="${holdingId.id}"` }).then((holding) => {
                      expectedHoldings[index].hrid = holding[0].hrid;
                    });
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
        'C825265 Search holdings by Former IDs (firebird)',
        { tags: ['extendedPath', 'firebird', 'C825265'] },
        () => {
          // Step 1-2: Search holdings by "Holdings — Former IDs" field using "starts with" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.formerIds);
          QueryModal.verifySelectedField(holdingsFieldValues.formerIds);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('hold');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyFormerIds(holding, holding.formerIds);
          });

          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
