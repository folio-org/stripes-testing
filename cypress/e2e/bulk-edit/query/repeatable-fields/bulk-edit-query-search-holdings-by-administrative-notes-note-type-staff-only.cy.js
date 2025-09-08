import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { HOLDING_NOTE_TYPES } from '../../../../support/constants';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
const noteTypeIds = [];
const folioInstance = {
  title: `AT_C813611_FolioInstance_${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};

const getHoldingNotesData = (copyNoteId, provenanceId, reproductionId, generalNoteId) => [
  {
    // Holdings 1
    administrativeNotes: ['Geography & Map Reading Room'],
    notes: [{ note: 'Copy note details', holdingsNoteTypeId: copyNoteId, staffOnly: true }],
  },
  {
    // Holdings 2
    administrativeNotes: ['Geography & Map Reading Room'],
    notes: [
      { note: 'Copy note details', holdingsNoteTypeId: copyNoteId, staffOnly: true },
      {
        note: 'In upper left corner: provisional',
        holdingsNoteTypeId: provenanceId,
        staffOnly: false,
      },
      {
        note: 'In upper right corner: 11379',
        holdingsNoteTypeId: reproductionId,
        staffOnly: false,
      },
    ],
  },
  {
    // Holdings 3
    administrativeNotes: ['Includes note and location map'],
    notes: [{ note: 'General note text', holdingsNoteTypeId: generalNoteId, staffOnly: false }],
  },
  {
    // Holdings 4 - empty
    administrativeNotes: [],
    notes: [],
  },
];

// Helper function to verify administrative notes
const verifyAdministrativeNotes = (holding, expectedAdminNotes) => {
  if (expectedAdminNotes && expectedAdminNotes.length > 0) {
    const adminNotesText = Array.isArray(expectedAdminNotes)
      ? expectedAdminNotes.join(' | ')
      : expectedAdminNotes;
    QueryModal.verifyMatchedRecordsByIdentifier(
      holding.hrid,
      holdingsFieldValues.holdingsAdminNotes,
      adminNotesText,
    );
  }
};

// Helper function to verify holding notes
const verifyHoldingNotes = (holding) => {
  QueryModal.verifyNotesEmbeddedTableInQueryModal(holding.hrid, holding.notes);
};

// Function to create expected holdings array
const createExpectedHoldings = (holdingHrids) => [
  {
    hrid: holdingHrids[0],
    administrativeNotes: 'Geography & Map Reading Room',
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.COPY_NOTE,
        note: 'Copy note details',
        staffOnly: 'True',
      },
    ],
  },
  {
    hrid: holdingHrids[1],
    administrativeNotes: 'Geography & Map Reading Room',
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.COPY_NOTE,
        note: 'Copy note details',
        staffOnly: 'True',
      },
      {
        noteType: HOLDING_NOTE_TYPES.PROVENANCE,
        note: 'In upper left corner: provisional',
        staffOnly: 'False',
      },
      {
        noteType: HOLDING_NOTE_TYPES.REPRODUCTION,
        note: 'In upper right corner: 11379',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: holdingHrids[2],
    administrativeNotes: 'Includes note and location map',
    notes: [
      {
        noteType: HOLDING_NOTE_TYPES.NOTE,
        note: 'General note text',
        staffOnly: 'False',
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813611');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get holding note type IDs
          [
            HOLDING_NOTE_TYPES.COPY_NOTE,
            HOLDING_NOTE_TYPES.PROVENANCE,
            HOLDING_NOTE_TYPES.REPRODUCTION,
            HOLDING_NOTE_TYPES.NOTE,
          ].forEach((noteType) => {
            cy.getHoldingNoteTypeIdViaAPI(noteType).then((id) => {
              noteTypeIds.push(id);
            });
          });

          // Get instance type ID
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          // Get holding type ID
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            holdingTypeId = holdingTypes[0].id;
          });
          // Get default location
          cy.getLocations({ limit: 1 }).then((locations) => {
            locationId = locations.id;

            // Generate holdings with required fields and notes
            const holdingNotesData = getHoldingNotesData(...noteTypeIds);
            const holdingsWithRequiredFields = holdingNotesData.map((holding) => ({
              holdingsTypeId: holdingTypeId,
              permanentLocationId: locationId,
              administrativeNotes: holding.administrativeNotes,
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
        'C813611 Search holdings by Administrative notes, Note type, Staff only (firebird)',
        { tags: ['criticalPath', 'firebird', 'C813611'] },
        () => {
          // Create expected holdings for verification
          const expectedHoldings = createExpectedHoldings(folioInstance.holdingHrids);

          // Step 1-2: Search holdings by "Holdings — Administrative notes" field using "equals" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(holdingsFieldValues.holdingsAdminNotes);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsAdminNotes);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Geography & Map Reading Room');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.administrative_notes == Geography & Map Reading Room) AND (holdings.instance_id == ${folioInstance.id})`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Notes');
          QueryModal.clickShowColumnsButton();

          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyAdministrativeNotes(holding, holding.administrativeNotes);
            verifyHoldingNotes(holding);
          });

          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Verify Notes fields are queryable under "Select options" dropdown
          const notesFields = [
            holdingsFieldValues.notesNoteType,
            holdingsFieldValues.notes,
            holdingsFieldValues.notesStaffOnly,
          ];

          notesFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifyFieldsSortedAlphabetically();

          // Step 4: Search holdings by "Holdings — Notes — Note type" field using "equals" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(holdingsFieldValues.notesNoteType);
          QueryModal.verifySelectedField(holdingsFieldValues.notesNoteType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(HOLDING_NOTE_TYPES.COPY_NOTE);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.notes[*]->holdings_note_type == ${HOLDING_NOTE_TYPES.COPY_NOTE}) AND (holdings.instance_id == ${folioInstance.id})`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
            verifyAdministrativeNotes(holding, holding.administrativeNotes);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5-6: Search holdings by "Holdings — Notes — Staff only" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.notesStaffOnly);
          QueryModal.verifySelectedField(holdingsFieldValues.notesStaffOnly);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(holdings.notes[*]->staff_only == true) AND (holdings.instance_id == ${folioInstance.id}) and (notes.type_id == ${HOLDING_NOTE_TYPES.COPY_NOTE}) and (notes.staff_only == true)`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyHoldingNotes(holding);
            verifyAdministrativeNotes(holding, holding.administrativeNotes);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
