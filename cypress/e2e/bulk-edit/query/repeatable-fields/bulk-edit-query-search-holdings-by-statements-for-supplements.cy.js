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
  title: `AT_C813660_FolioInstance_${getRandomPostfix()}`,
};
const expectedHoldings = [
  {
    // Holdings 1
    holdingsStatementsForSupplements: [
      {
        statement: 'Supplements 1910-1916',
        note: 'Bound with other issues for the year',
        staffNote: 'incomplete vols. unbound',
      },
    ],
  },
  {
    // Holdings 2 - multiple statements
    holdingsStatementsForSupplements: [
      {
        statement: 'Supplements to v. 1-7 (1942-1948)',
        note: 'bound in one volume',
        staffNote: 'test',
      },
      {
        statement: 'Supplements to v. 1-2 (1942-1944), 4-7 (1946-1948)',
        note: 'Bound with other issues for the year',
        staffNote: 'some issues incomplete',
      },
      {
        statement: 'test',
        note: 'test',
        staffNote: 'test',
      },
    ],
  },
  {
    // Holdings 3
    holdingsStatementsForSupplements: [
      {
        statement: 'ca. 300 pieces',
        note: 'bound in one volume',
        staffNote: 'test',
      },
    ],
  },
  {
    // Holdings 4 - empty
    holdingsStatementsForSupplements: [],
  },
];

// Helper function to verify statements for supplements
const verifyStatementsForSupplements = (holding) => {
  QueryModal.verifyStatementsForSupplementsEmbeddedTableInQueryModal(
    holding.hrid,
    holding.holdingsStatementsForSupplements,
  );
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813660');

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
                  holdingsStatementsForSupplements: holding.holdingsStatementsForSupplements,
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
        'C813660 Search holdings by Statements for supplements fields (firebird)',
        { tags: [] },
        () => {
          // Step 1: Verify Statements for supplements fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const statementsFields = [
            holdingsFieldValues.statementsForSupplementsStatement,
            holdingsFieldValues.statementsForSupplementsPublicNote,
            holdingsFieldValues.statementsForSupplementsStaffNote,
          ];

          statementsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(statementsFields);

          // Step 2: Search holdings by "Statement for supplement" field using "starts with" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(holdingsFieldValues.statementsForSupplementsStatement);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForSupplementsStatement);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Supplements');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Statements for supplements');
          QueryModal.clickShowColumnsButton();

          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForSupplements(holding);
          });

          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search holdings by "Statement for supplement public note" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.statementsForSupplementsPublicNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForSupplementsPublicNote);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Bound with other issues for the year');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForSupplements(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search holdings by "Statement for supplement staff note" field using "contains" operator
          QueryModal.selectField(holdingsFieldValues.statementsForSupplementsStaffNote);
          QueryModal.verifySelectedField(holdingsFieldValues.statementsForSupplementsStaffNote);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('incomplete');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyStatementsForSupplements(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Check display of Holdings data from Preconditions in "Holdings — Statements for supplements" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            expectedHoldings[3].hrid,
            'Holdings — Statements for supplements',
            '',
          );
        },
      );
    });
  });
});
