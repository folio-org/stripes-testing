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
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

let user;
const folioInstance = {
  title: `AT_C805788_FolioInstance_${getRandomPostfix()}`,
};
const items = [];

const getItemNotesData = () => [
  {
    // Item 1
    checkInNotes: [{ note: 'The item being damaged', staffOnly: true }],
    checkOutNotes: [{ note: 'The item being damaged', staffOnly: true }],
  },
  {
    // Item 2 - multiple check in and check out notes
    checkInNotes: [
      { note: 'The item being damaged', staffOnly: true },
      { note: 'Check in note', staffOnly: false },
    ],
    checkOutNotes: [
      { note: 'Not damaged', staffOnly: false },
      { note: 'Check out note', staffOnly: true },
    ],
  },
  {
    // Item 3
    checkInNotes: [{ note: 'Damaged item', staffOnly: false }],
    checkOutNotes: [{ note: 'Damaged item', staffOnly: false }],
  },
  {
    // Item 4 - no notes
    checkInNotes: [],
    checkOutNotes: [],
  },
];

// Expected items structure for verification
const expectedItems = [
  {
    barcode: '', // Will be filled in before hook
    checkInNotes: [
      {
        noteType: 'Check in',
        note: 'The item being damaged',
        staffOnly: 'True',
      },
    ],
    checkOutNotes: [
      {
        noteType: 'Check out',
        note: 'The item being damaged',
        staffOnly: 'True',
      },
    ],
  },
  {
    barcode: '', // Will be filled in before hook
    checkInNotes: [
      {
        noteType: 'Check in',
        note: 'The item being damaged',
        staffOnly: 'True',
      },
      {
        noteType: 'Check in',
        note: 'Check in note',
        staffOnly: 'False',
      },
    ],
    checkOutNotes: [
      {
        noteType: 'Check out',
        note: 'Not damaged',
        staffOnly: 'False',
      },
      {
        noteType: 'Check out',
        note: 'Check out note',
        staffOnly: 'True',
      },
    ],
  },
  {
    barcode: '', // Will be filled in before hook
    checkInNotes: [
      {
        noteType: 'Check in',
        note: 'Damaged item',
        staffOnly: 'False',
      },
    ],
    checkOutNotes: [
      {
        noteType: 'Check out',
        note: 'Damaged item',
        staffOnly: 'False',
      },
    ],
  },
  {
    barcode: '', // Will be filled in before hook
    checkInNotes: [],
    checkOutNotes: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805788');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get required IDs for instance, holding, and items
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            cy.getDefaultMaterialType().then((materialType) => {
              cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                  cy.getLocations({ limit: 1 }).then((location) => {
                    // Generate items with required fields and notes
                    const itemNotesData = getItemNotesData();
                    const itemsToCreate = itemNotesData.map((itemData, index) => ({
                      barcode: `AT_C805788_Item_${index + 1}_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      materialType: { id: materialType.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      circulationNotes: [
                        ...itemData.checkInNotes.map((note) => ({
                          note: note.note,
                          noteType: 'Check in',
                          staffOnly: note.staffOnly,
                        })),
                        ...itemData.checkOutNotes.map((note) => ({
                          note: note.note,
                          noteType: 'Check out',
                          staffOnly: note.staffOnly,
                        })),
                      ],
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

                      // Store item data for verification and populate barcodes
                      createdInstanceData.items.forEach((item, index) => {
                        items.push({
                          id: item.id,
                          barcode: item.barcode,
                          hrid: item.hrid,
                        });
                        // Populate barcodes in expectedItems array
                        expectedItems[index].barcode = item.barcode;
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
        'C805788 Search items by Check in notes fields, Check out notes fields using AND operator (firebird)',
        { tags: ['criticalPath', 'firebird', 'C805788'] },
        () => {
          // Step 1: Verify Check out notes fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const checkOutNotesFields = [
            itemFieldValues.itemCheckOutNotesNote,
            itemFieldValues.itemCheckOutNotesStaffOnly,
          ];

          checkOutNotesFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifySubsetOfFieldsSortedAlphabetically(checkOutNotesFields);

          // Step 2-3: Search items by "Items — Check out notes — Note", "Items — Check out notes — Staff only" fields using AND operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(itemFieldValues.itemCheckOutNotesNote);
          QueryModal.verifySelectedField(itemFieldValues.itemCheckOutNotesNote);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('damaged');
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemCheckOutNotesStaffOnly, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('True', 1);
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.itemBarcode, 2);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 2);
          QueryModal.fillInValueTextfield('AT_C805788_Item', 2);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.check_out_notes[*]->note contains damaged) AND (items.check_out_notes[*]->staff_only == true) AND (items.barcode starts with AT_C805788_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyColumnDisplayed('Item — Check out notes');

          // Expected to find: Item 1 and Item 2 (both have check out notes containing "damaged" with Staff only = True)
          const expectedItemsToFind = [expectedItems[0], expectedItems[1]];

          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.checkOutNotes);
          });

          // Not expected to find: Item 3 and Item 4
          const notExpectedToFindItemBarcodes = [
            expectedItems[2].barcode,
            expectedItems[3].barcode,
          ];

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 4: Verify Check in notes fields are queryable under "Select options" dropdown
          const checkInNotesFields = [
            itemFieldValues.itemCheckInNotesNote,
            itemFieldValues.itemCheckInNotesStaffOnly,
          ];

          checkInNotesFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifyFieldsSortedAlphabetically();
          QueryModal.clickGarbage(1);

          // Step 5: Search items by "Items — Check in notes — Note" field using "equals" operator
          QueryModal.selectField(itemFieldValues.itemCheckInNotesNote);
          QueryModal.verifySelectedField(itemFieldValues.itemCheckInNotesNote);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('The item being damaged');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.check_in_notes[*]->note == The item being damaged) AND (items.barcode starts with AT_C805788_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.scrollResultTable('right');
          QueryModal.verifyColumnDisplayed('Item — Check in notes');

          // Expected to find: Item 1 and Item 2 (both have "The item being damaged" in check in notes)
          expectedItemsToFind.forEach((item) => {
            QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.checkInNotes);
          });

          notExpectedToFindItemBarcodes.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 6: Search items by "Items — Check in notes — Staff only" field using "equals" operator
          QueryModal.selectField(itemFieldValues.itemCheckInNotesStaffOnly);
          QueryModal.verifySelectedField(itemFieldValues.itemCheckInNotesStaffOnly);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(items.check_in_notes[*]->staff_only == false) AND (items.barcode starts with AT_C805788_Item)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Item 2 and Item 3 (both have Staff only = False in check in notes)
          const expectedItemsToFindByStaffOnly = [expectedItems[1], expectedItems[2]];

          expectedItemsToFindByStaffOnly.forEach((item) => {
            QueryModal.verifyNotesEmbeddedTableInQueryModal(item.barcode, item.checkInNotes);
          });

          // Not expected to find: Item 1 and Item 4
          const notExpectedToFindByStaffOnly = [expectedItems[0].barcode, expectedItems[3].barcode];

          notExpectedToFindByStaffOnly.forEach((barcode) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
          });

          // Step 7: Check display of Item data from Preconditions in "Item — Check in notes" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            expectedItems[3].barcode,
            'Item — Check in notes',
            '',
          );
        },
      );
    });
  });
});
