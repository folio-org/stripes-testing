import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let statisticalCodes;
let fileNames;
const folioInstance = {
  title: `AT_C700836_FolioInstance_${getRandomPostfix()}`,
  holdingHrids: [],
};
const expectedHoldings = [
  {
    // Holding 1
    tags: { tagList: ['important'] },
  },
  {
    // Holding 2
    tags: { tagList: ['important', 'urgent', 'test'] },
  },
  {
    // Holding 3
    tags: { tagList: ['test'] },
  },
  {
    // Holding 4
    tags: { tagList: [] },
  },
];

// Helper function to populate string properties for UI display
const populateHoldingStringProperties = (holdingData, statCodes) => {
  holdingData.tagsString = holdingData.tags.tagList.join(' | ');

  if (holdingData.statisticalCodeIds.length === 0) {
    holdingData.statisticalCodeName = '';
    return;
  }

  if (holdingData.statisticalCodeIds.length === 1) {
    const code = statCodes.find((c) => c.id === holdingData.statisticalCodeIds[0]);
    holdingData.statisticalCodeName = code.fullName;
  } else {
    const codeNames = holdingData.statisticalCodeIds.map(
      (id) => statCodes.find((c) => c.id === id).fullName,
    );
    holdingData.statisticalCodeName = codeNames.join(' | ');
    holdingData.statisticalCodeNameInBulkEditForm = codeNames.join('|');
  }
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C700836');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get statistical codes first (get 4 codes to match TestRail preconditions)
          cy.getStatisticalCodes({ limit: 4 }).then((codes) => {
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              // Build full names for statistical codes
              statisticalCodes = codes.map((code) => {
                const codeType = codeTypes.find((type) => type.id === code.statisticalCodeTypeId);
                return {
                  ...code,
                  typeName: codeType.name,
                  fullName: `${codeType.name}: ${code.code} - ${code.name}`,
                };
              });

              // Statistical code assignments for each holding
              const holdingStatisticalCodeConfig = [
                { holdingIndex: 0, codeIndexes: [0] },
                { holdingIndex: 1, codeIndexes: [0, 1, 2] },
                { holdingIndex: 2, codeIndexes: [3] },
                { holdingIndex: 3, codeIndexes: [] },
              ];

              // Assign statistical codes to holdings based on configuration
              holdingStatisticalCodeConfig.forEach((config) => {
                expectedHoldings[config.holdingIndex].statisticalCodeIds = config.codeIndexes.map(
                  (index) => statisticalCodes[index].id,
                );
                populateHoldingStringProperties(
                  expectedHoldings[config.holdingIndex],
                  statisticalCodes,
                );
              });

              // Get required IDs for instance and holdings
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                  cy.getLocations({ limit: 1 }).then((location) => {
                    // Create holdings array with all 4 holdings
                    const holdingsToCreate = expectedHoldings.map((holdingData) => ({
                      holdingsTypeId: holdingTypes[0].id,
                      permanentLocationId: location.id,
                      statisticalCodeIds: holdingData.statisticalCodeIds,
                      tags: holdingData.tags,
                    }));

                    // Create one instance with multiple holdings
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: folioInstance.title,
                      },
                      holdings: holdingsToCreate,
                    }).then((createdInstanceData) => {
                      folioInstance.id = createdInstanceData.instanceId;
                      folioInstance.holdingIds = createdInstanceData.holdingIds;

                      // Get holdings HRIDs using the holding IDs
                      folioInstance.holdingIds.forEach((holdingId, index) => {
                        cy.getHoldings({ query: `"id"="${holdingId.id}"` }).then((holdings) => {
                          expectedHoldings[index].hrid = holdings[0].hrid;
                          expectedHoldings[index].id = holdings[0].id;
                        });
                      });

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
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C700836 Search holdings by Statistical code names, Tags (firebird)',
        { tags: ['criticalPath', 'firebird', 'C700836'] },
        () => {
          // Step 1: Search holdings by "Holdings — Statistical codes" field using "in" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(holdingsFieldValues.holdingsStatisticalCodeNames);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsStatisticalCodeNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(statisticalCodes[0].fullName);
          QueryModal.chooseFromValueMultiselect(statisticalCodes[1].fullName);
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.statistical_code_names in [${statisticalCodes[0].fullName}, ${statisticalCodes[1].fullName}]) AND (holdings.instance_id == ${folioInstance.id})`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Holdings 1, 2
          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              holding.hrid,
              holdingsFieldValues.holdingsStatisticalCodeNames,
              holding.statisticalCodeName,
            );
          });

          // Not expected to find: Holdings 3, 4
          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 2: Click "Run query" button and check "Statistical codes" column in Preview of records matched
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview').then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];

            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
            );

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              expectedHoldings[0].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
              expectedHoldings[0].statisticalCodeName,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              expectedHoldings[1].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
              expectedHoldings[1].statisticalCodeNameInBulkEditForm,
            );

            // Step 3: Download matched records (CSV) and check populating "Statistical codes" column in the file
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              expectedHoldings[0].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
              expectedHoldings[0].statisticalCodeName,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              expectedHoldings[1].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
              expectedHoldings[1].statisticalCodeNameInBulkEditForm,
            );
          });

          // Step 4: Navigate back to build query
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 5: Search holdings by "Holdings — Tags" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.holdingsTags);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsTags);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('important');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.tags == important) AND (holdings.instance_id == ${folioInstance.id})`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Holdings 1, 2
          expectedHoldingsToFind.forEach((holding) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              holding.hrid,
              holdingsFieldValues.holdingsTags,
              holding.tagsString,
            );
          });

          // Not expected to find: Holdings 3, 4
          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
