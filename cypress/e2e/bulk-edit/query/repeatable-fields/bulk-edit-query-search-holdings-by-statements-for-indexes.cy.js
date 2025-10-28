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
  title: `AT_C813667_FolioInstance_${getRandomPostfix()}`,
};
const expectedHoldings = [
  {
    // Holdings 1
    holdingsStatementsForIndexes: [
      {
        statement: '1937-1942, 1946-1968, plus 1969/1978 cumulative vol.',
        note: 'bound at end of volume to which it applies',
        staffNote: 'Ten year cumulative index',
      },
    ],
  },
  {
    // Holdings 2 - multiple statements
    holdingsStatementsForIndexes: [
      {
        statement: '1937-1942',
        note: 'bound in one volume',
        staffNote: 'alphabetical index',
      },
      {
        statement: '1969/1978',
        note: 'Bound with other issues for the year',
        staffNote: 'Ten year cumulative index',
      },
      {
        statement: '1946-1968',
        note: 'test',
        staffNote: 'Index',
      },
    ],
  },
  {
    // Holdings 3
    holdingsStatementsForIndexes: [
      {
        statement: '1969-1978',
        note: 'Mar. 1969 issue cut up as of Jan. 1978',
        staffNote: 'ten year cumulative index covering the years 1969-1978',
      },
    ],
  },
  {
    // Holdings 4 - empty
    holdingsStatementsForIndexes: [],
  },
];

// Helper function to verify statements for indexes
const verifyStatementsForIndexes = (holding) => {
  QueryModal.verifyStatementsForIndexesEmbeddedTableInQueryModal(
    holding.hrid,
    holding.holdingsStatementsForIndexes,
  );
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813667');

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

                // Generate holdings with required fields and statements
                const holdingsWithRequiredFields = expectedHoldings.map((holding) => ({
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                  holdingsStatementsForIndexes: holding.holdingsStatementsForIndexes,
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

                  // Populate HRIDs in the expectedHoldings array
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

      // Trillium
      it.skip(
        'C813667 Search holdings by Statements for indexes fields (firebird)',
        { tags: [] },
        () => {
          // Step 1: Verify Statements for indexes fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const statementsFields = [
            holdingsFieldValues.statementsForIndexesStatement,
            holdingsFieldValues.statementsForIndexesPublicNote,
            holdingsFieldValues.statementsForIndexesStaffNote,
          ];

          statementsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(statementsFields);

          // Step 2: Search holdings by "Statement for indexes" field using "contains" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(holdingsFieldValues.statementsForIndexesStatement);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForIndexesStatement);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('1969/1978');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Statements for indexes');
          QueryModal.clickShowColumnsButton();

          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForIndexes(holding);
          });

          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search holdings by "Statement for indexes public note" field using "starts with" operator
          QueryModal.selectField(holdingsFieldValues.statementsForIndexesPublicNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForIndexesPublicNote);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('bound');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForIndexes(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search holdings by "Statement for indexes staff note" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.statementsForIndexesStaffNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForIndexesStaffNote);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Ten year cumulative index');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForIndexes(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Check display of Holdings data from Preconditions in "Holdings — Statements for indexes" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            expectedHoldings[3].hrid,
            'Holdings — Statements for indexes',
            '',
          );
        },
      );
    });
  });
});
