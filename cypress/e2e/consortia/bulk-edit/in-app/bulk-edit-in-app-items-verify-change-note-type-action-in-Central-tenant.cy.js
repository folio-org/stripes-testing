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
  ITEM_NOTE_TYPES,
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
  title: `C478254 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
};
const marcInstance = {
  title: `C478254 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
};
const collegeItemIds = [];
const universityItemIds = [];
const administrativeNoteText = 'Administrative note text';
const sharedNoteText = 'New shared note';
const collegeNoteText = 'College local note';
const universityNoteText = 'University local note';
const checkInNoteText = 'Check in note text';
const centralSharedItemNoteType = {
  payload: {
    name: `C478254 shared note type ${getRandomPostfix()}`,
  },
};
const collegeItemNoteType = {
  name: `C478254 College NoteType ${getRandomPostfix()}`,
};
const universityItemNoteType = {
  name: `C478254 University NoteType ${getRandomPostfix()}`,
};
const collegeItemNoteTypeNameWithAffiliation = `${collegeItemNoteType.name} (${Affiliations.College})`;
const universityItemNoteTypeNameWithAffiliation = `${universityItemNoteType.name} (${Affiliations.University})`;
const instances = [folioInstance, marcInstance];
const getReasonForError = (itemId, tenantName) => {
  return `${itemId} cannot be updated because the record is associated with ${tenantName} and note type is not associated with this tenant.`;
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
          cy.getLocations({ limit: 1 }).then((res) => {
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
              cy.log(centralSharedItemNoteType);
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
                  administrativeNotes: [administrativeNoteText],
                  notes: [
                    {
                      holdingsNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: collegeItemNoteType.id,
                      note: collegeNoteText,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { noteType: 'Check in', note: checkInNoteText, staffOnly: true },
                  ],
                }).then((item) => {
                  collegeItemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);

              // create local item note type in University tenant
              InventoryInstances.createHoldingsNoteTypeViaApi(universityItemNoteType.name).then(
                (noteId) => {
                  universityItemNoteType.id = noteId;
                },
              );
              // create holdings in University tenant
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
                  administrativeNotes: [administrativeNoteText],
                  notes: [
                    {
                      holdingsNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: universityItemNoteType.id,
                      note: universityNoteText,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { noteType: 'Check in', note: checkInNoteText, staffOnly: true },
                  ],
                }).then((item) => {
                  universityItemIds.push(item.id);
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

        collegeItemIds.forEach((id) => {
          cy.deleteItemViaApi(id);
        });
        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.setTenant(Affiliations.University);

        ItemNoteTypes.deleteItemNoteTypeViaApi(universityItemNoteType.id);

        universityItemIds.forEach((id) => {
          cy.deleteItemViaApi(id);
        });
        instances.forEach((instance) => {
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
        'C478254 Verify "Change note type" action for Items in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C478254'] },
        () => {
          // 1
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

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              ITEM_STATUS_NAMES.AVAILABLE,
            );
          });
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          // 4

          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );

          const collegeItemBarcodes = [
            folioInstance.barcodeInCollege,
            marcInstance.barcodeInCollege,
          ];
          const universityItemBarcodes = [
            folioInstance.barcodeInUniversity,
            marcInstance.barcodeInUniversity,
          ];

          const initialHeaderValueInCollege = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            { header: collegeItemNoteTypeNameWithAffiliation, value: collegeNoteText },
          ];
          const initialHeaderValueInUniversity = [
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: universityItemNoteTypeNameWithAffiliation,
              value: universityNoteText,
            },
          ];

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              initialHeaderValueInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              initialHeaderValueInUniversity,
            );
          });

          // 6

          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            universityItemNoteTypeNameWithAffiliation,
          );

          // 7
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              initialHeaderValueInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              initialHeaderValueInUniversity,
            );
          });

          // 8

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 9
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedItemNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            universityItemNoteTypeNameWithAffiliation,
          );

          // 10
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.changeNoteType(
            ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE,
            ITEM_NOTE_TYPES.CHECK_OUT_NOTE,
          );

          BulkEditSearchPane.isConfirmButtonDisabled(false);
          // 14
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.changeNoteType(
            centralSharedItemNoteType.payload.name,
            universityItemNoteTypeNameWithAffiliation,
            1,
          );
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          // 15
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.changeNoteType(
            collegeItemNoteTypeNameWithAffiliation,
            ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE,
            2,
          );

          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 16
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.changeNoteType(
            ITEM_NOTE_TYPES.CHECK_IN_NOTE,
            ITEM_NOTE_TYPES.CHECK_OUT_NOTE,
            3,
          );
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 17
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          // check if those header/value correct

          const headerValuesToEditInCollege = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${administrativeNoteText} | ${checkInNoteText} (staff only)`,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: collegeNoteText,
            },
          ];
          const headerValuesToEditInUniversity = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${administrativeNoteText} | ${checkInNoteText} (staff only)`,
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: '',
            },
            {
              header: universityItemNoteTypeNameWithAffiliation,
              value: `${sharedNoteText} (staff only) | ${universityNoteText}`,
            },
          ];

          BulkEditActions.verifyAreYouSureForm(4);

          collegeItemBarcodes.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              headerValuesToEditInCollege,
            );
          });
          universityItemBarcodes.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              headerValuesToEditInUniversity,
            );
          });

          // 18

          BulkEditActions.downloadPreview();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesToEditInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesToEditInUniversity,
            );
          });
          // 19
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          const editedHederValueInCollege = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${administrativeNoteText} | ${checkInNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: collegeNoteText,
            },
          ];
          const editedHederValueInUniversity = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${administrativeNoteText} | ${checkInNoteText} (staff only)`,
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: '',
            },
            {
              header: universityItemNoteTypeNameWithAffiliation,
              value: `${sharedNoteText} (staff only) | ${universityNoteText}`,
            },
          ];
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              editedHederValueInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              editedHederValueInUniversity,
            );
          });

          BulkEditSearchPane.verifyErrorLabelInErrorAccordion(itemUUIDsFileName, 4, 4, 2);
          BulkEditSearchPane.verifyNonMatchedResults();

          collegeItemIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForError(id, Affiliations.College),
            );
          });
          universityItemIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForError(id, Affiliations.University),
            );
          });

          // 22

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              barcode,
              editedHederValueInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              barcode,
              editedHederValueInUniversity,
            );
          });

          // 23

          BulkEditActions.downloadErrors();

          collegeItemIds.forEach((id) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `${id},${getReasonForError(id, Affiliations.College)}`,
            ]);
          });
          universityItemIds.forEach((id) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `${id},${getReasonForError(id, Affiliations.University)}`,
            ]);
          });

          // 24
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          collegeItemBarcodes.forEach((barcode) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(collegeNoteText);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              centralSharedItemNoteType.payload.name,
              sharedNoteText,
            );
            ItemRecordView.checkCheckOutNote(administrativeNoteText);
            ItemRecordView.checkCheckOutNote(checkInNoteText);
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              universityItemNoteType.name,
              sharedNoteText,
            );
            ItemRecordView.checkCheckOutNote(administrativeNoteText);
            ItemRecordView.checkCheckOutNote(checkInNoteText);
          });
        },
      );
    });
  });
});
