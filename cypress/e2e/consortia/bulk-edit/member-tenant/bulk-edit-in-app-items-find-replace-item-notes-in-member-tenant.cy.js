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
  title: `AT_C566167_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
  itemHrid: '',
};
const marcInstance = {
  title: `AT_C566167_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode__${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
  itemHrid: '',
};
const notes = {
  adminUpperCase: 'Test [administrative] no*te',
  adminLowerCase: 'test [administrative] no*te',
  sharedUpperCase: 'Test item shared note',
  sharedLowerCase: 'test item shared note',
  localUpperCase: 'Test item local note',
  localLowerCase: 'test item local note',
  checkOutUpperCase: 'Test check out note',
  checkOutLowerCase: 'test check out note',
};
const sharedItemNoteType = {
  payload: {
    name: `AT_C566167 shared note type ${randomFourDigitNumber()}`,
  },
};
const localItemNoteType = {
  name: `AT_C566167 local note type ${randomFourDigitNumber()}`,
};
const localItemNoteTypeName = localItemNoteType.name;
const instances = [folioInstance, marcInstance];
const itemHridsFileName = `itemHridsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemHridsFileName, true);

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
                  // Create items for both holdings with all required notes
                  cy.getMaterialTypes({ limit: 1 }).then((res) => {
                    materialTypeId = res.id;

                    instances.forEach((instance) => {
                      InventoryItems.createItemViaApi({
                        barcode: instance.itemBarcode,
                        holdingsRecordId: instance.holdingId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        administrativeNotes: [notes.adminUpperCase, notes.adminLowerCase],
                        notes: [
                          {
                            itemNoteTypeId: sharedNoteTypeData.settingId,
                            note: notes.sharedUpperCase,
                            staffOnly: true,
                          },
                          {
                            itemNoteTypeId: sharedNoteTypeData.settingId,
                            note: notes.sharedLowerCase,
                            staffOnly: false,
                          },
                          {
                            itemNoteTypeId: localItemNoteType.id,
                            note: notes.localUpperCase,
                            staffOnly: true,
                          },
                          {
                            itemNoteTypeId: localItemNoteType.id,
                            note: notes.localLowerCase,
                            staffOnly: false,
                          },
                        ],
                        circulationNotes: [
                          { note: notes.checkOutUpperCase, noteType: 'Check out', staffOnly: true },
                          {
                            note: notes.checkOutLowerCase,
                            noteType: 'Check out',
                            staffOnly: false,
                          },
                        ],
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
                  // Create .csv file with item barcodes
                  FileManager.createFile(
                    `cypress/fixtures/${itemHridsFileName}`,
                    `${folioInstance.itemHrid}\n${marcInstance.itemHrid}`,
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
        FileManager.deleteFile(`cypress/fixtures/${itemHridsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566167 Verify "Find & replace" action for Items notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566167'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item HRIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(itemHridsFileName);

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(itemHridsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemHridsFileName);

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

          // Step 10-14: Select Administrative note
          BulkEditActions.noteReplaceWith(
            'Administrative note',
            notes.adminUpperCase,
            notes.adminLowerCase,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 15: Click Plus icon
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);

          // Step 16: Shared note type, Find & Replace
          BulkEditActions.noteReplaceWith(
            sharedItemNoteType.payload.name,
            notes.sharedUpperCase,
            notes.sharedLowerCase,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 17: Local note type, Find & Replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteReplaceWith(
            localItemNoteTypeName,
            notes.localUpperCase,
            notes.localLowerCase,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 18: Check out note, Find & Replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteReplaceWith(
            'Check out note',
            notes.checkOutUpperCase,
            notes.checkOutLowerCase,
            3,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 19: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: `${notes.adminLowerCase};${notes.adminLowerCase}`,
            },
            {
              header: sharedItemNoteType.payload.name,
              value: `${notes.sharedLowerCase} (staff only) | ${notes.sharedLowerCase}`,
            },
            {
              header: localItemNoteTypeName,
              value: `${notes.localLowerCase} (staff only) | ${notes.localLowerCase}`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${notes.checkOutLowerCase} (staff only) | ${notes.checkOutLowerCase}`,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 20: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 21: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 22: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 23: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(notes.adminLowerCase);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'YesNo',
              localItemNoteTypeName,
              `${notes.localLowerCase}${notes.localLowerCase}`,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'YesNo',
              sharedItemNoteType.payload.name,
              `${notes.sharedLowerCase}${notes.sharedLowerCase}`,
            );
            ItemRecordView.checkCheckOutNote(
              `${notes.checkOutLowerCase}${notes.checkOutLowerCase}`,
            );
            ItemRecordView.checkStaffOnlyValueInLoanAccordion('YesNo');
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
