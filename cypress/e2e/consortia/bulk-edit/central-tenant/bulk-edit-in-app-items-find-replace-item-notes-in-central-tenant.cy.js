import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ItemNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
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
  title: `C478262 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C478262 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const notes = {
  adminUpperCase: 'Test [administrative] note',
  adminLowerCase: 'test [administrative] note',
  sharedUpperCase: 'Test item shared note',
  sharedLowerCase: 'test item shared note',
  collegeUpperCase: 'Test item college note',
  collegeLowerCase: 'test item college note',
  checkOutUpperCase: 'Test item check out note',
  checkOutLowerCase: 'test item check out note',
};
const centralSharedItemNoteType = {
  payload: {
    name: `C478262 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeItemNoteType = {
  name: `C478262 College NoteType ${randomFourDigitNumber()}`,
};
const collegeItemNoteTypeNameWithAffiliation = `${collegeItemNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditItems.gui,
            ]);
            cy.resetTenant();
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
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
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });

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
                  administrativeNotes: [notes.adminUpperCase, notes.adminLowerCase],
                  notes: [
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: notes.sharedUpperCase,
                      staffOnly: true,
                    },
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: notes.sharedLowerCase,
                      staffOnly: false,
                    },
                    {
                      itemNoteTypeId: collegeItemNoteType.id,
                      note: notes.collegeUpperCase,
                      staffOnly: true,
                    },
                    {
                      itemNoteTypeId: collegeItemNoteType.id,
                      note: notes.collegeLowerCase,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { note: notes.checkOutUpperCase, noteType: 'Check out', staffOnly: true },
                    { note: notes.checkOutLowerCase, noteType: 'Check out', staffOnly: false },
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
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });

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
                  administrativeNotes: [notes.adminUpperCase, notes.adminLowerCase],
                  notes: [
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: notes.sharedUpperCase,
                      staffOnly: true,
                    },
                    {
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: notes.sharedLowerCase,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { note: notes.checkOutUpperCase, noteType: 'Check out', staffOnly: true },
                    { note: notes.checkOutLowerCase, noteType: 'Check out', staffOnly: false },
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

          cy.resetTenant();
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
        'C478262 Verify "Find & replace" action for Items notes in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C478262'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 item');
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

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedItemNoteType.payload.name,
            collegeItemNoteTypeNameWithAffiliation,
          );

          const initialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: `${notes.adminUpperCase};${notes.adminLowerCase}`,
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${notes.sharedUpperCase} (staff only) | ${notes.sharedLowerCase}`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${notes.checkOutUpperCase} (staff only) | ${notes.checkOutLowerCase}`,
            },
          ];
          const collegeInitialHeaderValues = [
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: `${notes.collegeUpperCase} (staff only) | ${notes.collegeLowerCase}`,
            },
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              initialHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              collegeInitialHeaderValues,
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

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              initialHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeInitialHeaderValues,
            );
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedItemNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeItemNoteTypeNameWithAffiliation,
          );
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.noteReplaceWith(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            notes.adminUpperCase,
            notes.adminLowerCase,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteReplaceWith(
            centralSharedItemNoteType.payload.name,
            notes.sharedUpperCase,
            notes.sharedLowerCase,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteReplaceWith(
            collegeItemNoteTypeNameWithAffiliation,
            notes.collegeUpperCase,
            notes.collegeLowerCase,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteReplaceWith(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            notes.checkOutUpperCase,
            notes.checkOutLowerCase,
            3,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: `${notes.adminLowerCase};${notes.adminLowerCase}`,
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${notes.sharedLowerCase} (staff only) | ${notes.sharedLowerCase}`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${notes.checkOutLowerCase} (staff only) | ${notes.checkOutLowerCase}`,
            },
          ];
          const collegeEditedHeaderValues = [
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: `${notes.collegeLowerCase} (staff only) | ${notes.collegeLowerCase}`,
            },
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              editedHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              collegeEditedHeaderValues,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              editedHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeEditedHeaderValues,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              editedHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              collegeEditedHeaderValues,
            );
          });

          BulkEditSearchPane.verifyErrorLabel(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.itemIds[1],
              getReasonForTenantNotAssociatedError(
                instance.itemIds[1],
                Affiliations.University,
                'note type',
              ),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              editedHeaderValues,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeEditedHeaderValues,
            );
          });

          BulkEditActions.downloadErrors();

          instances.forEach((instance) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${instance.itemIds[1]},${getReasonForTenantNotAssociatedError(instance.itemIds[1], Affiliations.University, 'note type').trim()}`,
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
            ItemRecordView.checkItemAdministrativeNote(
              `${notes.adminLowerCase}\n${notes.adminLowerCase}`,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'YesNo',
              collegeItemNoteType.name,
              `${notes.collegeLowerCase}${notes.collegeLowerCase}`,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'YesNo',
              centralSharedItemNoteType.payload.name,
              `${notes.sharedLowerCase}${notes.sharedLowerCase}`,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'YesNo',
              'Check out note',
              `${notes.checkOutLowerCase}${notes.checkOutLowerCase}`,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(
              `${notes.adminLowerCase}\n${notes.adminLowerCase}`,
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'YesNo',
              centralSharedItemNoteType.payload.name,
              `${notes.sharedLowerCase}${notes.sharedLowerCase}`,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'YesNo',
              'Check out note',
              `${notes.checkOutLowerCase}${notes.checkOutLowerCase}`,
            );
            ItemRecordView.checkItemNoteAbsent(collegeItemNoteType.name);
          });
        },
      );
    });
  });
});
