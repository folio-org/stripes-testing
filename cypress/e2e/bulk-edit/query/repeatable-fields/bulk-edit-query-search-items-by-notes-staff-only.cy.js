import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
  booleanOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_NOTE_TYPES, ITEM_STATUS_NAMES } from '../../../../support/constants';

let user;
let actionNoteTypeId;
const folioInstance = {
  title: `AT_C805784_FolioInstance_${getRandomPostfix()}`,
};
const items = [];

const getItemNotesData = (actionNoteId) => [
  {
    notes: [{ note: 'Test note 1', itemNoteTypeId: actionNoteId, staffOnly: true }],
  },
  {
    notes: [{ note: 'Test note 2', itemNoteTypeId: actionNoteId, staffOnly: false }],
  },
  {
    notes: [
      { note: 'Test note 3', itemNoteTypeId: actionNoteId, staffOnly: true },
      { note: 'Test note 4', itemNoteTypeId: actionNoteId, staffOnly: false },
    ],
  },
  {
    notes: [
      { note: 'Test note 5', itemNoteTypeId: actionNoteId, staffOnly: true },
      { note: 'Test note 6', itemNoteTypeId: actionNoteId, staffOnly: false },
      { note: 'Test note 7', itemNoteTypeId: actionNoteId, staffOnly: true },
      { note: 'Test note 8', itemNoteTypeId: actionNoteId, staffOnly: false },
    ],
  },
  {
    notes: [],
  },
];

// Helper function to verify all notes for an item
const verifyItemNotes = (item) => {
  if (item.notes) {
    QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.notes);
  } else {
    // For items without notes, verify by barcode with empty notes column
    QueryModal.verifyMatchedRecordsByIdentifier(item.barcode, 'Item — Notes', '');
  }
};

// Function to create expected items array
const createExpectedItems = (itemBarcodes, noteTypeName) => [
  {
    barcode: itemBarcodes[0],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Test note 1',
        staffOnly: 'True',
      },
    ],
  },
  {
    barcode: itemBarcodes[1],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Test note 2',
        staffOnly: 'False',
      },
    ],
  },
  {
    barcode: itemBarcodes[2],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Test note 3',
        staffOnly: 'True',
        miniRowIndex: 1,
      },
      {
        noteType: noteTypeName,
        note: 'Test note 4',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
    ],
  },
  {
    barcode: itemBarcodes[3],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Test note 5',
        staffOnly: 'True',
        miniRowIndex: 1,
      },
      {
        noteType: noteTypeName,
        note: 'Test note 6',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
      {
        noteType: noteTypeName,
        note: 'Test note 7',
        staffOnly: 'True',
        miniRowIndex: 3,
      },
      {
        noteType: noteTypeName,
        note: 'Test note 8',
        staffOnly: 'False',
        miniRowIndex: 4,
      },
    ],
  },
  {
    barcode: itemBarcodes[4],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805784');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get action note type ID dynamically
          InventoryInstances.getItemNoteTypes({
            limit: 1,
            query: `name=="${ITEM_NOTE_TYPES.ACTION_NOTE}"`,
          }).then((itemNoteTypes) => {
            actionNoteTypeId = itemNoteTypes[0].id;

            const itemNotesData = getItemNotesData(actionNoteTypeId);

            // Get required IDs for instance, holding, and items
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              cy.getDefaultMaterialType().then((materialType) => {
                cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                  cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                    cy.getLocations({ limit: 1 }).then((location) => {
                      // Create items array with all 5 items
                      const itemsToCreate = itemNotesData.map((itemData, index) => ({
                        barcode: `AT_C805784_Item_${index + 1}_${getRandomPostfix()}`,
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        materialType: { id: materialType.id },
                        permanentLoanType: { id: loanTypes[0].id },
                        notes: itemData.notes,
                      }));

                      // Create one instance with one holding containing all 5 items
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

                        createdInstanceData.items.forEach((item) => {
                          items.push({
                            id: item.id,
                            barcode: item.barcode,
                            hrid: item.hrid,
                            holdingId: createdInstanceData.holdings[0].id,
                          });
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
        'C805784 Search items by Items — Notes — Staff only (all operators for true/false field) (firebird)',
        { tags: ['smoke', 'firebird', 'C805784'] },
        () => {
          // Get note type name for verification
          const noteTypeName = ITEM_NOTE_TYPES.ACTION_NOTE;

          // Create expected items for verification
          const itemBarcodes = items.map((item) => item.barcode);
          const expectedItems = createExpectedItems(itemBarcodes, noteTypeName);

          // Step 1: Verify operators for repeatable true/false field
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.itemNotesStaffOnly);
          QueryModal.verifySelectedField(itemFieldValues.itemNotesStaffOnly);
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(booleanOperators);

          // Step 2: Search using "equals" operator with "True"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C805784_Item', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Item — Notes');
          QueryModal.clickShowColumnsButton();

          let expectedItemsToFind = [expectedItems[0], expectedItems[2], expectedItems[3]];

          expectedItemsToFind.forEach((item) => {
            verifyItemNotes(item);
          });

          let notExpectedToFindItemBarcodes = [expectedItems[1].barcode, expectedItems[4].barcode];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 3: Search using "equals" operator with "False"
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind = [expectedItems[1], expectedItems[2], expectedItems[3]];

          expectedItemsToFind.forEach((item) => {
            verifyItemNotes(item);
          });

          notExpectedToFindItemBarcodes = [expectedItems[0].barcode, expectedItems[4].barcode];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 4: Search using "not equal to" operator with "True"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind = [expectedItems[1], expectedItems[4]];

          expectedItemsToFind.forEach((item) => {
            verifyItemNotes(item);
          });

          notExpectedToFindItemBarcodes = [
            expectedItems[0].barcode,
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 5-6: Search using "not equal to" operator with "False"
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind = [expectedItems[0], expectedItems[4]];

          expectedItemsToFind.forEach((item) => {
            verifyItemNotes(item);
          });

          notExpectedToFindItemBarcodes = [
            expectedItems[1].barcode,
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 7: Search using "is null/empty" operator with "True"
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind = expectedItems[4];

          verifyItemNotes(expectedItemsToFind);

          notExpectedToFindItemBarcodes = [
            expectedItems[0].barcode,
            expectedItems[1].barcode,
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 8: Search using "is null/empty" operator with "False"
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedItemsToFind = [
            expectedItems[0],
            expectedItems[1],
            expectedItems[2],
            expectedItems[3],
          ];

          expectedItemsToFind.forEach((item) => {
            verifyItemNotes(item);
          });

          notExpectedToFindItemBarcodes = expectedItems[4].barcode;

          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(notExpectedToFindItemBarcodes);
        },
      );
    });
  });
});
