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
  title: `AT_C566165_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const marcInstance = {
  title: `AT_C566165_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode__${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const administrativeNoteText =
  "Administrative note text ~,!,@,#,$,%,^,&,*,(,),~', {.[,]<},>,ø, Æ, §,";
const sharedNoteText = 'New shared note';
const localNoteText = 'New local note';
const checkInNoteText = "Check in note ~,!,@,#,$,%,^,&,*,(,),~', {.[,]<},>,ø, Æ, §,";
const checkOutNoteText = 'Check out note staff only';
const sharedItemNoteType = {
  payload: {
    name: `AT_C566165 shared note type ${randomFourDigitNumber()}`,
  },
};
const localItemNoteType = {
  name: `AT_C566165 local note type ${randomFourDigitNumber()}`,
};
const localItemNoteTypeName = localItemNoteType.name;
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);

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
                  // Create items for both holdings
                  cy.getMaterialTypes({ limit: 1 }).then((res) => {
                    materialTypeId = res.id;

                    instances.forEach((instance) => {
                      InventoryItems.createItemViaApi({
                        barcode: instance.itemBarcode,
                        holdingsRecordId: instance.holdingId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      }).then((item) => {
                        instance.itemId = item.id;
                      });
                      cy.wait(1000);
                    });
                  });
                })
                .then(() => {
                  // Create .csv file with item UUIDs
                  FileManager.createFile(
                    `cypress/fixtures/${itemUUIDsFileName}`,
                    `${folioInstance.itemId}\n${marcInstance.itemId}`,
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
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566165 Verify "Add note" action for Items in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566165'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

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
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_EFFECTIVE_LOCATION,
          );

          // Step 5: Check checkboxes for shared and local note types and Member column
          BulkEditSearchPane.changeShowColumnCheckbox(
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            sharedItemNoteType.payload.name,
            localItemNoteTypeName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
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
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instance.itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
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

          // Step 10-12: Select Administrative note
          BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Click Plus icon
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);

          // Step 14-15: Select shared note type, Add note, fill text, check staff only
          BulkEditActions.addItemNoteAndVerify(sharedItemNoteType.payload.name, sharedNoteText, 1);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
          BulkEditActions.checkStaffOnlyCheckbox(1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 16: Click Plus icon, select local note type, Add note, fill text
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.addItemNoteAndVerify(localItemNoteTypeName, localNoteText, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 17-18: Click Plus icon, select Check in note, Add note, fill text
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.addItemNoteAndVerify('Check in note', checkInNoteText, 3);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 19-20: Click Plus icon, select Check out note, Add note, fill text, check staff only
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(4);
          BulkEditActions.addItemNoteAndVerify('Check out note', checkOutNoteText, 4);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 4);
          BulkEditActions.checkStaffOnlyCheckbox(4);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 21: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: administrativeNoteText,
            },
            {
              header: sharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: localItemNoteTypeName,
              value: localNoteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: checkInNoteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${checkOutNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              value: tenantNames.college,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 22: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 23: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.itemBarcode,
              headerValuesToEdit,
            );
          });

          // Step 24: Download changed records
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

          // Step 25: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(administrativeNoteText);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'Yes',
              sharedItemNoteType.payload.name,
              sharedNoteText,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              localItemNoteType.name,
              localNoteText,
            );
            ItemRecordView.checkCheckInNote(checkInNoteText, 'No');
            ItemRecordView.checkCheckOutNote(checkOutNoteText);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
