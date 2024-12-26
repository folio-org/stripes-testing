import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ItemNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let centralSharedNoteTypeData;
const folioInstance = {
  title: `C494095 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C494095 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const sharedNoteText = 'Shared note text';
const collegeNoteText = 'College note text';
const checkInNoteText = 'Check in note text';
const checkOutNoteText = 'Check out note text';
const centralSharedItemNoteType = {
  payload: {
    name: `C494095 shared note type ${getRandomPostfix()}`,
  },
};
const collegeItemNoteType = {
  name: `C494095 College NoteType ${getRandomPostfix()}`,
};
const collegeItemNoteTypeNameWithAffiliation = `${collegeItemNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const getReasonForError = (itemId) => {
  return `${itemId} cannot be updated because the record is associated with ${Affiliations.University} and note type is not associated with this tenant.`;
};
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const matchedRecordsFileName = `${todayDate}-Matched-Records-${itemUUIDsFileName}`;
const previewFileName = `${todayDate}-Updates-Preview-${itemUUIDsFileName}`;
const changedRecordsFileName = `${todayDate}-Changed-Records-${itemUUIDsFileName}`;
const errorsFromCommittingFileName = `${todayDate}-Committing-changes-Errors-${itemUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          ItemNoteTypesConsortiumManager.createViaApi(centralSharedItemNoteType).then(
            (newItemNoteType) => {
              centralSharedNoteTypeData = newItemNoteType;
            },
          );

          cy.setTenant(Affiliations.College);
          // create local item note type in College
          ItemNoteTypes.createItemNoteTypeViaApi(collegeItemNoteType.name)
            .then((noteId) => {
              collegeItemNoteType.id = noteId;
            })
            .then(() => {
              cy.resetTenant();
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              // create holdings in College tenant
              cy.setTenant(Affiliations.College);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create items in College tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInCollege,
                  holdingsRecordId: instance.holdingIds[0],
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  notes: [
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: false,
                    },
                    {
                      itemNoteTypeId: collegeItemNoteType.id,
                      note: collegeNoteText,
                      staffOnly: true,
                    },
                  ],
                  circulationNotes: [
                    { note: checkInNoteText, noteType: 'Check in', staffOnly: false },
                    { note: checkOutNoteText, noteType: 'Check out', staffOnly: true },
                  ],
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create items in University tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInUniversity,
                  holdingsRecordId: instance.holdingIds[1],
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  notes: [
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { note: checkInNoteText, noteType: 'Check in', staffOnly: false },
                    { note: checkOutNoteText, noteType: 'Check out', staffOnly: true },
                  ],
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${itemUUIDsFileName}`,
                `${folioInstance.itemIds.join('\n')}\n${marcInstance.itemIds.join('\n')}`,
              );
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        ItemNoteTypes.deleteItemNoteTypeViaApi(collegeItemNoteType.id);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[0]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[1]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        ItemNoteTypesConsortiumManager.deleteViaApi(centralSharedNoteTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C494095 Verify "Staff only" action for Items notes in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494095'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

          const itemBarcodes = [
            folioInstance.barcodeInCollege,
            folioInstance.barcodeInUniversity,
            marcInstance.barcodeInCollege,
            marcInstance.barcodeInUniversity,
          ];
          const collegeItemBarcodes = [
            folioInstance.barcodeInCollege,
            marcInstance.barcodeInCollege,
          ];
          const universityItemBarcodes = [
            folioInstance.barcodeInUniversity,
            marcInstance.barcodeInUniversity,
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              ITEM_STATUS_NAMES.AVAILABLE,
            );
          });
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );

          const collegeInitialHeaderValues = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: sharedNoteText,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: `${collegeNoteText} (staff only)`,
            },
          ];
          const universityInitialHeaderValues = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: sharedNoteText,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: '',
            },
          ];

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              collegeInitialHeaderValues,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              universityInitialHeaderValues,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeInitialHeaderValues,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              universityInitialHeaderValues,
            );
          });

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedItemNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.markAsStaffOnly(centralSharedItemNoteType.payload.name);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.removeMarkAsStaffOnly(collegeItemNoteTypeNameWithAffiliation, 1);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.markAsStaffOnly('Check in note', 2);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.removeMarkAsStaffOnly('Check out note', 3);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const collegeHeaderValuesEdited = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: `${checkInNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: checkOutNoteText,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: collegeNoteText,
            },
          ];
          const universityHeaderValuesEdited = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: `${checkInNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: checkOutNoteText,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: '',
            },
          ];

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              collegeHeaderValuesEdited,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              universityHeaderValuesEdited,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditActions.downloadPreview();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeHeaderValuesEdited,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              universityHeaderValuesEdited,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              collegeHeaderValuesEdited,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              universityHeaderValuesEdited,
            );
          });

          BulkEditSearchPane.verifyErrorLabelInErrorAccordion(itemUUIDsFileName, 4, 4, 2);
          BulkEditSearchPane.verifyNonMatchedResults();

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.itemIds[1],
              getReasonForError(instance.itemIds[1]),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeHeaderValuesEdited,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              universityHeaderValuesEdited,
            );
          });

          BulkEditActions.downloadErrors();

          instances.forEach((instance) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `${instance.itemIds[1]},${getReasonForError(instance.itemIds[1])}`,
            ]);
          });

          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 2);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              collegeItemNoteType.name,
              collegeNoteText,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'Yes',
              centralSharedItemNoteType.payload.name,
              sharedNoteText,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'No',
              'Check out note',
              checkOutNoteText,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              4,
              'Yes',
              'Check in note',
              checkInNoteText,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              centralSharedItemNoteType.payload.name,
              sharedNoteText,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'No',
              'Check out note',
              checkOutNoteText,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              4,
              'Yes',
              'Check in note',
              checkInNoteText,
            );
            ItemRecordView.checkItemNoteAbsent(collegeItemNoteType.name);
          });
        },
      );
    });
  });
});
