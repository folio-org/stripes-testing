import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES, ITEM_NOTE_TYPES } from '../../../../support/constants';

let user;
const noteTypeIds = [];
const folioInstance = {
  title: `AT_C813674_FolioInstance_${getRandomPostfix()}`,
};
const items = [];

const getItemNotesData = (noteTypeId, copyNoteTypeId, bindingTypeId) => [
  {
    // Item 1
    administrativeNotes: ['Title transcribed from item'],
    notes: [{ note: 'Handwritten note: "1867."', itemNoteTypeId: noteTypeId, staffOnly: false }],
  },
  {
    // Item 2 - multiple administrative notes and notes
    administrativeNotes: [
      'Title from item',
      'This item used by permission of the copyright holder',
      'Includes bibliographical references',
    ],
    notes: [
      { note: 'Handwritten note on verso: Woodward', itemNoteTypeId: noteTypeId, staffOnly: false },
      { note: 'Handwritten note: "1867."', itemNoteTypeId: copyNoteTypeId, staffOnly: false },
      { note: 'Handwritten note: "16 August 1869."', itemNoteTypeId: noteTypeId, staffOnly: false },
    ],
  },
  {
    // Item 3
    administrativeNotes: ['Includes note'],
    notes: [
      {
        note: 'Handwritten note: "January 1867."',
        itemNoteTypeId: bindingTypeId,
        staffOnly: false,
      },
    ],
  },
  {
    // Item 4 - no notes or administrative notes
    administrativeNotes: [],
    notes: [],
  },
];

// Function to create expected items array
const createExpectedItems = (itemBarcodes) => [
  {
    barcode: itemBarcodes[0],
    administrativeNotes: ['Title transcribed from item'],
    notes: [
      {
        noteType: ITEM_NOTE_TYPES.NOTE,
        note: 'Handwritten note: "1867."',
        staffOnly: 'False',
      },
    ],
  },
  {
    barcode: itemBarcodes[1],
    administrativeNotes: [
      'Title from item',
      'This item used by permission of the copyright holder',
      'Includes bibliographical references',
    ],
    notes: [
      {
        noteType: ITEM_NOTE_TYPES.NOTE,
        note: 'Handwritten note on verso: Woodward',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: ITEM_NOTE_TYPES.COPY_NOTE,
        note: 'Handwritten note: "1867."',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
      {
        noteType: ITEM_NOTE_TYPES.NOTE,
        note: 'Handwritten note: "16 August 1869."',
        staffOnly: 'False',
        miniRowIndex: 3,
      },
    ],
  },
  {
    barcode: itemBarcodes[2],
    administrativeNotes: ['Includes note'],
    notes: [
      {
        noteType: ITEM_NOTE_TYPES.BINDING,
        note: 'Handwritten note: "January 1867."',
        staffOnly: 'False',
      },
    ],
  },
  {
    barcode: itemBarcodes[3],
    administrativeNotes: [],
    notes: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813674');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get item note type IDs
          [ITEM_NOTE_TYPES.NOTE, ITEM_NOTE_TYPES.COPY_NOTE, ITEM_NOTE_TYPES.BINDING].forEach(
            (noteType) => {
              InventoryInstances.getItemNoteTypes({
                limit: 1,
                query: `name=="${noteType}"`,
              }).then((itemNoteTypes) => {
                noteTypeIds.push(itemNoteTypes[0].id);
              });
            },
          );

          // Get required IDs for instance, holding, and items
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            cy.getDefaultMaterialType().then((materialType) => {
              cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                  cy.getLocations({ limit: 1 }).then((location) => {
                    // Generate items with required fields and notes
                    const itemNotesData = getItemNotesData(...noteTypeIds);
                    const itemsToCreate = itemNotesData.map((itemData, index) => ({
                      barcode: `AT_C813674_Item_${index + 1}_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      materialType: { id: materialType.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      administrativeNotes: itemData.administrativeNotes,
                      notes: itemData.notes,
                    }));

                    // Create one instance with one holding containing all items
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: folioInstance.title,
                      },
                      holdings: [
                        {
                          holdingsTypeId: holdingTypes[0].id,
                          permanentLocationId: location.id,
                        },
                      ],
                      items: itemsToCreate,
                    }).then((createdInstanceData) => {
                      folioInstance.id = createdInstanceData.instanceId;

                      // Store item data for verification
                      createdInstanceData.items.forEach((item) => {
                        items.push({
                          id: item.id,
                          barcode: item.barcode,
                          hrid: item.hrid,
                        });
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
        'C813674 Search items by Administrative notes, Note type, Note (firebird)',
        { tags: ['criticalPath', 'firebird', 'C813674'] },
        () => {
          // Create expected items for verification
          const itemBarcodes = items.map((item) => item.barcode);
          const expectedItems = createExpectedItems(itemBarcodes);

          // Step 1-2: Search items by "Items — Administrative notes" field using "contains" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.itemAdministrativeNotes);
          QueryModal.verifySelectedField(itemFieldValues.itemAdministrativeNotes);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('Title');
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C813674_Item', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.administrative_notes contains Title) AND (items.barcode starts with AT_C813674_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedItemsToFind = [expectedItems[0], expectedItems[1]];

          expectedItemsToFind.forEach((item) => {
            const expectedAdminNotesDisplay = item.administrativeNotes.join(' | ');
            QueryModal.verifyMatchedRecordsByIdentifier(
              item.barcode,
              itemFieldValues.itemAdministrativeNotes,
              expectedAdminNotesDisplay,
            );
          });

          const notExpectedToFindItems = [expectedItems[2].barcode, expectedItems[3].barcode];

          notExpectedToFindItems.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 3: Verify Notes fields are queryable under "Select options" dropdown
          const notesFields = [
            itemFieldValues.itemNotesNoteType,
            itemFieldValues.itemNotesNote,
            itemFieldValues.itemNotesStaffOnly,
          ];

          notesFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifyFieldsSortedAlphabetically();

          // Step 4: Search items by "Items — Notes — Note type" field using "in" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(itemFieldValues.itemNotesNoteType);
          QueryModal.verifySelectedField(itemFieldValues.itemNotesNoteType);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect(ITEM_NOTE_TYPES.NOTE);
          QueryModal.fillInValueMultiselect(ITEM_NOTE_TYPES.COPY_NOTE);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.notes[*]->item_note_type in [Note, Copy note]) AND (items.barcode starts with AT_C813674_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.notes);
          });

          notExpectedToFindItems.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 5: Search items by "Items — Notes — Note" field using "equals" operator
          QueryModal.selectField(itemFieldValues.itemNotesNote);
          QueryModal.verifySelectedField(itemFieldValues.itemNotesNote);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Handwritten note: "1867."');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.notes[*]->note == Handwritten note: "1867.") AND (items.barcode starts with AT_C813674_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.notes);
          });

          notExpectedToFindItems.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });
        },
      );
    });
  });
});
