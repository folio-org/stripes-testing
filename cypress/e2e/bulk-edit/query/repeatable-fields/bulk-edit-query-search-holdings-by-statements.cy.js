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
  title: `AT_C813659_FolioInstance_${getRandomPostfix()}`,
};
const expectedHoldings = [
  {
    // Holdings 1
    holdingsStatements: [
      {
        statement: '1-86 (1941-1987)',
        note: 'Some issues missing',
        staffNote: 'bound in 2 v. per year',
      },
    ],
  },
  {
    // Holdings 2 - multiple statements
    holdingsStatements: [
      {
        statement: '1-86 (1941-1987)',
        note: 'Some issues lost',
        staffNote: 'Bound in 3 v. per year',
      },
      {
        statement: '1-86',
        note: 'Bound; some issues missing',
        staffNote: 'Bound; some issues missing',
      },
      {
        statement: '(1941-1987)',
        note: 'Some issues missing',
        staffNote: '-',
      },
    ],
  },
  {
    // Holdings 3
    holdingsStatements: [
      {
        statement: '1941-1987',
        note: 'Scattered issues wanting',
        staffNote: 'incomplete vols. unbound',
      },
    ],
  },
  {
    // Holdings 4 - empty
    holdingsStatements: [],
  },
];

// Helper function to verify statements
const verifyStatements = (holding) => {
  QueryModal.verifyStatementsEmbeddedTableInQueryModal(holding.hrid, holding.holdingsStatements);
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813659');

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
                  holdingsStatements: holding.holdingsStatements,
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

      it(
        'C813659 Search holdings by Statements fields (firebird)',
        { tags: ['criticalPath', 'firebird', 'C813659'] },
        () => {
          // Step 1: Verify Statements fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const statementsFields = [
            holdingsFieldValues.statementsStatement,
            holdingsFieldValues.statementsPublicNote,
            holdingsFieldValues.statementsStaffNote,
          ];

          statementsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifySubsetOfFieldsSortedAlphabetically(statementsFields);

          // Step 2: Search holdings by "Holdings — Statements — Statement" field using "equals" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(holdingsFieldValues.statementsStatement);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsStatement);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('1-86 (1941-1987)');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Holdings 1 and Holdings 2 (both have "1-86 (1941-1987)" statement)
          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatements(holding);
          });

          // Not expected to find: Holdings 3 and Holdings 4
          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search holdings by "Holdings — Statements — Statement public note" field using "contains" operator
          QueryModal.selectField(holdingsFieldValues.statementsPublicNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsPublicNote);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('issues missing');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatements(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search holdings by "Holdings — Statements — Statement staff note" field using "starts with" operator
          QueryModal.selectField(holdingsFieldValues.statementsStaffNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsStaffNote);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('bound in');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatements(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Check display of Holdings data from Preconditions in "Holdings — Statements" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            expectedHoldings[3].hrid,
            'Holdings — Statements',
            '',
          );
        },
      );
    });
  });
});
