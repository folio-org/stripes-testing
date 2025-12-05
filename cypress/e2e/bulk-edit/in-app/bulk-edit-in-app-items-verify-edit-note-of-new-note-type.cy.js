import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_ACTIONS,
  ITEM_NOTE_TYPES,
} from '../../../support/constants';

let user;
let newItemNoteTypeId;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let newItemNoteType;
let note31999Chars;
let instance;
let testItems;
let itemBarcodesFileName;
let fileNames;

describe('Bulk-edit', () => {
  describe(
    'In-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        newItemNoteType = `AT_C402356_New_item_note_type_${randomFourDigitNumber()}`;
        note31999Chars = 'Lorem ipsum dolor sit amet. '.repeat(1142) + 'Lorem ipsum dolor siEND';
        instance = {
          instanceTitle: `AT_C402356_FolioInstance_${getRandomPostfix()}`,
        };
        testItems = [];
        itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create new item note type
          ItemNoteTypes.createItemNoteTypeViaApi(newItemNoteType).then((noteTypeId) => {
            newItemNoteTypeId = noteTypeId;

            cy.wait(3000); // Waiting to ensure that item note type is created before proceeding

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              materialTypeId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              sourceId = folioSource.id;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instance.instanceTitle,
                },
              }).then((createdInstanceData) => {
                instance.instanceId = createdInstanceData.instanceId;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.instanceId,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingId = holding.id;

                  // Create 3 items with different notes in the same holding
                  const itemsData = [
                    {
                      barcode: `item1_${randomFourDigitNumber()}`,
                      notes: [
                        {
                          itemNoteTypeId: newItemNoteTypeId,
                          note: note31999Chars,
                          staffOnly: false,
                        },
                      ],
                    },
                    {
                      barcode: `item2_${randomFourDigitNumber()}`,
                      administrativeNotes: [note31999Chars],
                    },
                    {
                      barcode: `item3_${randomFourDigitNumber()}`,
                      circulationNotes: [
                        {
                          noteType: 'Check in',
                          note: note31999Chars,
                          staffOnly: false,
                        },
                      ],
                    },
                  ];

                  cy.wrap(itemsData)
                    .each((itemData) => {
                      InventoryItems.createItemViaApi({
                        barcode: itemData.barcode,
                        holdingsRecordId: instance.holdingId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: 'Available' },
                        ...(itemData.notes && { notes: itemData.notes }),
                        ...(itemData.administrativeNotes && {
                          administrativeNotes: itemData.administrativeNotes,
                        }),
                        ...(itemData.circulationNotes && {
                          circulationNotes: itemData.circulationNotes,
                        }),
                      }).then((item) => {
                        testItems.push({
                          itemId: item.id,
                          barcode: itemData.barcode,
                        });
                      });
                    })
                    .then(() => {
                      const itemBarcodes = testItems.map((item) => item.barcode);

                      FileManager.createFile(
                        `cypress/fixtures/${itemBarcodesFileName}`,
                        itemBarcodes.join('\n'),
                      );
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

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
        ItemNoteTypes.deleteItemNoteTypeViaApi(newItemNoteTypeId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C402356 Verify Bulk Edit actions for Items notes - edit note of new note type and containing 31999 characters (firebird)',
        { tags: ['extendedPath', 'firebird', 'C402356'] },
        () => {
          // Step 1: Select the "Inventory - items" radio button on the "Record types" accordion => Select "Item barcode" option from the "Record identifier" dropdown
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

          // Step 2: Upload a .csv file from Preconditions with valid Item barcodes by dragging it on the "Drag & drop" area
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check the result of uploading the .csv file with Items barcodes
          BulkEditSearchPane.verifyPaneRecordsCount('3 item');

          // Step 4: Click "Actions" menu => Check checkboxes (if not yet checked) next to: "Administrative Note", "New item note type", "Check in notes"
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            newItemNoteType,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          );

          const itemColumnsToVerify = [
            { barcode: testItems[0].barcode, column: newItemNoteType },
            {
              barcode: testItems[1].barcode,
              column: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            },
            {
              barcode: testItems[2].barcode,
              column: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            },
          ];

          itemColumnsToVerify.forEach(({ barcode, column }) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              column,
              note31999Chars,
            );
          });

          // Step 5: Click "Actions" menu => Select "Download matched records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          itemColumnsToVerify.forEach(({ barcode, column }) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              column,
              note31999Chars,
            );
          });

          // Step 6: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyRowIcons();

          // Step 7: Click "Select option" dropdown in "Options" column under "Bulk edits" accordion
          BulkEditActions.verifyItemOptions();
          BulkEditActions.verifySelectOptionsSortedAlphabetically();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(newItemNoteType);
          BulkEditActions.clickOptionsSelection();

          // Step 8: Select "Administrative note" option from "Select option" dropdown
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          );

          // Step 9: Click "Select action" dropdown in "Actions" column
          BulkEditActions.verifyTheActionOptionsEqual(
            [
              BULK_EDIT_ACTIONS.ADD_NOTE,
              BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
              BULK_EDIT_ACTIONS.FIND,
              BULK_EDIT_ACTIONS.REMOVE_ALL,
            ],
            false,
          );

          // Step 10: Select "Change note type" option from "Select action" dropdown
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);

          // Step 11: Click the dropdown with note types next to "Select action" dropdown
          const expecteNoteTypesFirst = Object.values(ITEM_NOTE_TYPES)
            .filter((noteType) => noteType !== ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE)
            .concat(newItemNoteType);

          BulkEditActions.verifyTheOptionsForChangingNoteType(expecteNoteTypesFirst);

          // Step 12: Select Item note type added in Preconditions #2 (e.g. "New item note type") from the dropdown with note types
          BulkEditActions.selectNoteTypeWhenChangingIt(newItemNoteType);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Click on the "Plus" icon
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow();

          // Step 14: Select "Check in note" option from "Select option" dropdown
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            1,
          );

          // Step 15: Click "Select action" dropdown in "Actions" column
          BulkEditActions.verifyTheActionOptionsEqual(
            [
              BULK_EDIT_ACTIONS.ADD_NOTE,
              BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
              BULK_EDIT_ACTIONS.DUPLICATE_TO,
              BULK_EDIT_ACTIONS.FIND,
              BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
              BULK_EDIT_ACTIONS.REMOVE_ALL,
              BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
            ],
            false,
            1,
          );

          // Step 16: Select "Change note type" option from "Select action" dropdown
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE, 1);

          // Step 17: Click the dropdown with note types next to "Select action" dropdown
          const expecteNoteTypesSecond = Object.values(ITEM_NOTE_TYPES)
            .filter((noteType) => noteType !== ITEM_NOTE_TYPES.CHECK_IN_NOTE)
            .concat(newItemNoteType);

          BulkEditActions.verifyTheOptionsForChangingNoteType(expecteNoteTypesSecond, 1);

          // Step 18: Select Item note type added in Preconditions #2 (e.g. "New item note type") from the dropdown with note types
          BulkEditActions.selectNoteTypeWhenChangingIt(newItemNoteType, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 19: Click on the "Plus" icon
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);

          // Step 20: Select Item note type added in Preconditions #2 (e.g. "New item note type") in the "Select option" dropdown
          BulkEditActions.selectOption(newItemNoteType, 2);

          // Step 21: Click "Select action" dropdown in "Actions" column
          BulkEditActions.verifyTheActionOptionsEqual(
            [
              BULK_EDIT_ACTIONS.ADD_NOTE,
              BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
              BULK_EDIT_ACTIONS.FIND,
              BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
              BULK_EDIT_ACTIONS.REMOVE_ALL,
              BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
            ],
            false,
            2,
          );

          // Step 22: Select "Mark as staff only" option from "Select action" dropdown
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 23: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(3);

          const editedHeaderValues = [
            {
              header: newItemNoteType,
              value: `${note31999Chars} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: '',
            },
          ];

          testItems.forEach((item) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              item.barcode,
              editedHeaderValues,
            );
          });

          // Step 24: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          testItems.forEach((item) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              item.barcode,
              editedHeaderValues,
            );
          });

          // Step 25: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(3);

          testItems.forEach((item) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              item.barcode,
              editedHeaderValues,
            );
          });

          // Step 26: Click the "Actions" menu => Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          testItems.forEach((item) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              item.barcode,
              editedHeaderValues,
            );
          });

          // Step 27: Navigate to "Inventory" app => Search for the recently edited Items => Verify that changes made in Steps 10, 16, 22 have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();

          testItems.forEach((item) => {
            InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote('');
            ItemRecordView.verifyTextAbsent('Check in note');
            ItemRecordView.checkItemNote(note31999Chars, 'Yes', newItemNoteType);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    },
  );
});
