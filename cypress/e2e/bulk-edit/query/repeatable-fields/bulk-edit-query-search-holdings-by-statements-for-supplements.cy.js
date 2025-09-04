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
  holdingHrids: [],
};

const getHoldingStatementsData = () => [
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

// Function to create expected holdings array
const createExpectedHoldings = (holdingHrids) => [
  {
    hrid: holdingHrids[0],
    holdingsStatementsForSupplements: [
      {
        statement: 'Supplements 1910-1916',
        note: 'Bound with other issues for the year',
        staffNote: 'incomplete vols. unbound',
      },
    ],
  },
  {
    hrid: holdingHrids[1],
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
    hrid: holdingHrids[2],
    holdingsStatementsForSupplements: [
      {
        statement: 'ca. 300 pieces',
        note: 'bound in one volume',
        staffNote: 'test',
      },
    ],
  },
  {
    hrid: holdingHrids[3],
  },
];

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

          const holdingStatementsData = getHoldingStatementsData();

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
                const holdingsWithRequiredFields = holdingStatementsData.map((holding) => ({
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

                  createdInstanceData.holdingIds.forEach((holdingId) => {
                    cy.getHoldings({ query: `"id"="${holdingId.id}"` }).then((holding) => {
                      folioInstance.holdingHrids.push(holding[0].hrid);
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
        'C813660 Search holdings by Statements for supplements fields (firebird)',
        { tags: ['criticalPath', 'firebird', 'C813660'] },
        () => {
          // Create expected holdings for verification
          const expectedHoldings = createExpectedHoldings(folioInstance.holdingHrids);

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
          QueryModal.verifyFieldsSortedAlphabetically();

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

          // Step 4-5: Search holdings by "Statement for supplement staff note" field using "contains" operator
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
        },
      );
    });
  });
});
