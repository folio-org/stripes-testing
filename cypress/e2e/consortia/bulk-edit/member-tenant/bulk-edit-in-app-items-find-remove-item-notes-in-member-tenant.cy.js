import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ItemNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let sharedNoteTypeData;
const folioInstance = {
  title: `AT_C566168_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
  itemHrid: '',
  itemFormerIdentifier: `former_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566168_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode__${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
  itemHrid: '',
  itemFormerIdentifier: `former_${getRandomPostfix()}`,
};
const notes = {
  admin: 'test: [administrative] no*te',
  shared: 'test item shared note',
  local: 'test item local note',
  checkOut: 'test check out note',
};
const editedNotes = {
  admin: 'test [administrative] no*te',
  shared: 'test item shared ',
  local: 'test item  note',
  checkOut: 'test check ',
};
const sharedItemNoteType = {
  payload: {
    name: `AT_C566168 shared note type ${randomFourDigitNumber()}`,
  },
};
const localItemNoteType = {
  name: `AT_C566168 local note type ${randomFourDigitNumber()}`,
};
const localItemNoteTypeName = localItemNoteType.name;
const instances = [folioInstance, marcInstance];
const itemFormerIdentifiersFileName = `itemFormerIdentifiersFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemFormerIdentifiersFileName, true);

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // Create shared item note type in central tenant
        ItemNoteTypesConsortiumManager.createViaApi(sharedItemNoteType).then((newItemNoteType) => {
          sharedNoteTypeData = newItemNoteType;

          cy.withinTenant(Affiliations.College, () => {
            cy.createTempUser([
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditItems.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
                loanTypeId = res[0].id;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                sourceId = folioSource.id;
              });
              // Create local item note type in member tenant
              ItemNoteTypes.createItemNoteTypeViaApi(localItemNoteType.name)
                .then((noteId) => {
                  localItemNoteType.id = noteId;
                })
                .then(() => {
                  // Create FOLIO instance
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: folioInstance.title,
                    },
                  }).then((createdInstanceData) => {
                    folioInstance.id = createdInstanceData.instanceId;
                  });
                })
                .then(() => {
                  // Create MARC instance
                  cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                    marcInstance.id = instanceId;
                  });
                })
                .then(() => {
                  // Create holdings for both instances
                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.id,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      instance.holdingId = holding.id;
                    });
                    cy.wait(1000);
                  });
                })
                .then(() => {
                  // Create items for both holdings with all required notes and former identifier
                  cy.getMaterialTypes({ limit: 1 }).then((res) => {
                    materialTypeId = res.id;

                    instances.forEach((instance) => {
                      InventoryItems.createItemViaApi({
                        barcode: instance.itemBarcode,
                        holdingsRecordId: instance.holdingId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        administrativeNotes: [notes.admin],
                        notes: [
                          {
                            itemNoteTypeId: sharedNoteTypeData.settingId,
                            note: notes.shared,
                            staffOnly: false,
                          },
                          {
                            itemNoteTypeId: localItemNoteType.id,
                            note: notes.local,
                            staffOnly: false,
                          },
                        ],
                        circulationNotes: [
                          { note: notes.checkOut, noteType: 'Check out', staffOnly: false },
                        ],
                        formerIds: [instance.itemFormerIdentifier],
                      }).then((item) => {
                        instance.itemId = item.id;
                        cy.getItems({
                          limit: 1,
                          expandAll: true,
                          query: `"barcode"=="${instance.itemBarcode}"`,
                        }).then((itemData) => {
                          instance.itemHrid = itemData.hrid;
                        });
                      });
                      cy.wait(1000);
                    });
                  });
                })
                .then(() => {
                  // Create .csv file with item former identifiers
                  FileManager.createFile(
                    `cypress/fixtures/${itemFormerIdentifiersFileName}`,
                    `${folioInstance.itemFormerIdentifier}\n${marcInstance.itemFormerIdentifier}`,
                  );
                });
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ItemNoteTypesConsortiumManager.deleteViaApi(sharedNoteTypeData);
        cy.setTenant(Affiliations.College);
        ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteType.id);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemFormerIdentifiersFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566168 Verify "Find & remove" action for Items notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566168'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
            'Items',
            'Item former identifiers',
          );

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(itemFormerIdentifiersFileName);

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(itemFormerIdentifiersFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemFormerIdentifiersFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.itemBarcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              ITEM_STATUS_NAMES.AVAILABLE,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Check Items note types under Show columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_EFFECTIVE_LOCATION,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            localItemNoteTypeName,
          );

          // Step 5: Check checkboxes for shared and local note types
          BulkEditSearchPane.changeShowColumnCheckbox(
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
          );

          [sharedItemNoteType.payload.name, localItemNoteTypeName].forEach((column) => {
            BulkEditSearchPane.verifyResultColumnTitles(column);
          });

          // Step 6: Uncheck checkboxes for shared and local note types
          BulkEditSearchPane.changeShowColumnCheckbox(
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
          );

          // Step 7: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instance.itemId,
            );
          });

          // Step 8: Start bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 9: Check Items note types in Select option dropdown
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(localItemNoteTypeName);
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(sharedItemNoteType.payload.name);
          BulkEditActions.clickOptionsSelection();

          // Step 10-12: Administrative note, Find & Remove
          BulkEditActions.noteRemove('Administrative note', ':');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Shared note type, Find & Remove
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteRemove(sharedItemNoteType.payload.name, 'note', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 14: Local note type, Find & Remove
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteRemove(localItemNoteTypeName, 'local', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 15: Check out note, Find & Remove
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteRemove('Check out note', 'out note', 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 16: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: editedNotes.admin,
            },
            {
              header: sharedItemNoteType.payload.name,
              value: editedNotes.shared,
            },
            {
              header: localItemNoteTypeName,
              value: editedNotes.local,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: editedNotes.checkOut,
            },
          ];
          const headerValuesToEditInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: editedNotes.admin,
            },
            {
              header: sharedItemNoteType.payload.name,
              value: 'test item shared',
            },
            {
              header: localItemNoteTypeName,
              value: editedNotes.local,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: 'test check',
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 17: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              headerValuesToEditInFile,
            );
          });

          // Step 18: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 19: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              headerValuesToEditInFile,
            );
          });

          // Step 20: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(editedNotes.admin);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              localItemNoteTypeName,
              editedNotes.local,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'No',
              sharedItemNoteType.payload.name,
              editedNotes.shared,
            );
            ItemRecordView.checkCheckOutNote(editedNotes.checkOut, 'No');
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
