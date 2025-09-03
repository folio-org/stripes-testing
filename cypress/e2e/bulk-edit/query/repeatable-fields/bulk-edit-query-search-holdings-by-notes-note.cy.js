import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { HOLDING_NOTE_TYPES } from '../../../../support/constants';

let user;
let actionNoteTypeId;
const folioInstance = {
  title: `AT_C805770_FolioInstance_${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};

const getHoldingNotesData = (holdingsNoteTypeId) => [
  {
    notes: [{ note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false }],
  },
  {
    notes: [
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false },
      {
        note: 'no.1-29 copies duplicate',
        holdingsNoteTypeId,
        staffOnly: false,
      },
    ],
  },
  {
    notes: [
      {
        note: 'duplicate copies no.1-29',
        holdingsNoteTypeId,
        staffOnly: false,
      },
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false },
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: true },
      { note: 'duplicate', holdingsNoteTypeId, staffOnly: false },
      {
        note: 'no.1-29 copies duplicate',
        holdingsNoteTypeId,
        staffOnly: false,
      },
    ],
  },
  {
    notes: [
      {
        note: 'duplicate copies no.1-29',
        holdingsNoteTypeId,
        staffOnly: false,
      },
      { note: 'duplicate', holdingsNoteTypeId, staffOnly: false },
    ],
  },
  {
    notes: [{ note: 'copies duplicate', holdingsNoteTypeId, staffOnly: false }],
  },
  {
    notes: [],
  },
];

// Helper function to verify all notes for a holding
const verifyHoldingNotes = (holding) => {
  if (holding.notes) {
    QueryModal.verifyNotesEmbeddedTableInQueryModal(holding.hrid, holding.notes);
  } else {
    // For holdings without notes, verify by HRID with empty notes column
    QueryModal.verifyMatchedRecordsByIdentifier(holding.hrid, 'Holdings — Notes', '');
  }
};

// Function to create expected holdings array
const createExpectedHoldings = (holdingHrids) => [
  {
    hrid: holdingHrids[0],
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: holdingHrids[1],
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'no.1-29 copies duplicate',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
    ],
  },
  {
    hrid: holdingHrids[2],
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'no.1-29 copies duplicate',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies',
        staffOnly: 'True',
        miniRowIndex: 3,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies',
        staffOnly: 'False',
        miniRowIndex: 4,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies no.1-29',
        staffOnly: 'False',
        miniRowIndex: 5,
      },
    ],
  },
  {
    hrid: holdingHrids[3],
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'duplicate copies no.1-29',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
    ],
  },
  {
    hrid: holdingHrids[4],
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.ACTION_NOTE,
        note: 'copies duplicate',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
    ],
  },
  {
    hrid: holdingHrids[5],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805770');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get holdings note type ID dynamically
          cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.ACTION_NOTE).then((noteTypeId) => {
            actionNoteTypeId = noteTypeId;
            const holdingNotesData = getHoldingNotesData(actionNoteTypeId);

            // Get instance type ID
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Get holding type ID
              cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                const holdingTypeId = holdingTypes[0].id;

                // Get default location
                cy.getLocations({ limit: 1 }).then((locations) => {
                  const locationId = locations.id;

                  // Generate holdings with required fields and notes
                  const holdingsWithRequiredFields = holdingNotesData.map((holding) => ({
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                    notes: holding.notes,
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
                    folioInstance.holdingIds = createdInstanceData.holdingIds;

                    folioInstance.holdingIds.forEach((holdingId) => {
                      cy.getHoldings({ query: `"id"="${holdingId.id}"` }).then((holding) => {
                        folioInstance.holdingHrids.push(holding[0].hrid);
                      });
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
        'C805770 Search holdings by Holdings — Notes — Note (all operators for free text field) (firebird)',
        { tags: ['smoke', 'firebird', 'C805770'] },
        () => {
          // Create expected holdings for verification
          const expectedHoldings = createExpectedHoldings(folioInstance.holdingHrids);

          // Step 1: Verify operators for repeatable free text field
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(holdingsFieldValues.notes);
          QueryModal.verifySelectedField(holdingsFieldValues.notes);
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(Object.values(STRING_OPERATORS));

          // Step 2: Search using "equals" operator
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Notes');
          QueryModal.clickShowColumnsButton();

          let expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          let notExpectedToFindHoldingHrids = [
            expectedHoldings[3].hrid,
            expectedHoldings[4].hrid,
            expectedHoldings[5].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search using "not equal to" operator
          QueryModal.selectOperator(STRING_OPERATORS.NOT_EQUAL);
          QueryModal.fillInValueTextfield('copies duplicate');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
            expectedHoldings[3],
            expectedHoldings[5],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          notExpectedToFindHoldingHrids = [expectedHoldings[4].hrid];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Verify Holdings — Notes column display
          expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
            expectedHoldings[3],
            expectedHoldings[5],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          // Step 5: Search using "contains" operator
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
            expectedHoldings[3],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          notExpectedToFindHoldingHrids = [expectedHoldings[4].hrid, expectedHoldings[5].hrid];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search using "starts with" operator
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
            expectedHoldings[3],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          notExpectedToFindHoldingHrids = [expectedHoldings[4].hrid, expectedHoldings[5].hrid];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Search using "is null/empty" operator with "True" value
          QueryModal.selectOperator(STRING_OPERATORS.IS_NULL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify empty holdings (index 5) - it will be found for null/empty search
          expectedHoldingsToFind = [expectedHoldings[5]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          notExpectedToFindHoldingHrids = [
            expectedHoldings[0].hrid,
            expectedHoldings[1].hrid,
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
            expectedHoldings[4].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 8: Search using "is null/empty" operator with "False" value
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind = [
            expectedHoldings[0],
            expectedHoldings[1],
            expectedHoldings[2],
            expectedHoldings[3],
            expectedHoldings[4],
          ];

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
          });

          notExpectedToFindHoldingHrids = expectedHoldings[5].hrid;

          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(notExpectedToFindHoldingHrids);
        },
      );
    });
  });
});
