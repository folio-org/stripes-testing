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
  ITEM_NOTE_TYPES,
  LOAN_TYPE_NAMES,
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
  title: `AT_C552508_FolioInstance_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
};
const marcInstance = {
  title: `AT_C552508_MarcInstance_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
};
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];
const collegeItemIds = [];
const universityItemIds = [];
const administrativeNoteText = 'te;st: [administrative] no*te';
const sharedNoteText = 'test item shared note';
const collegeNoteText = 'test item local note';
const checkOutNoteText = 'test check out note';
const centralSharedItemNoteType = {
  payload: {
    name: `C552508 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeItemNoteType = {
  name: `C552508 College NoteType ${randomFourDigitNumber()}`,
};
const collegeItemNoteTypeNameWithAffiliation = `${collegeItemNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  itemUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);
            cy.resetTenant();
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          ItemNoteTypesConsortiumManager.createViaApi(centralSharedItemNoteType)
            .then((newItemNoteType) => {
              centralSharedNoteTypeData = newItemNoteType;
            })
            .then(() => {
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
              cy.setTenant(Affiliations.College);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              // create local item note type in College
              ItemNoteTypes.createItemNoteTypeViaApi(collegeItemNoteType.name)
                .then((noteId) => {
                  collegeItemNoteType.id = noteId;
                })
                .then(() => {
                  // create holdings in College tenant
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
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: true,
                    },
                    {
                      itemNoteTypeId: collegeItemNoteType.id,
                      note: collegeNoteText,
                      staffOnly: false,
                    },
                  ],
                  circulationNotes: [
                    { noteType: 'Check out', note: checkOutNoteText, staffOnly: false },
                  ],
                }).then((item) => {
                  collegeItemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
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
                      itemNoteTypeId: centralSharedNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: true,
                    },
                  ],
                  circulationNotes: [
                    { noteType: 'Check out', note: checkOutNoteText, staffOnly: false },
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
                `${collegeItemIds.join('\n')}\n${universityItemIds.join('\n')}`,
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

        collegeItemIds.forEach((id) => {
          cy.deleteItemViaApi(id);
        });
        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.setTenant(Affiliations.University);

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
        'C552508 Verify "Find & remove" action for Items notes in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C552508'] },
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
          BulkEditActions.noteRemove(ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE, administrativeNoteText);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteRemove(centralSharedItemNoteType.payload.name, sharedNoteText, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteRemove(collegeItemNoteTypeNameWithAffiliation, collegeNoteText, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteRemove(ITEM_NOTE_TYPES.CHECK_OUT_NOTE, checkOutNoteText, 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: 'null (staff only)',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: '',
            },
          ];

          BulkEditActions.verifyAreYouSureForm(4);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              headerValuesToEdit,
            );
          });

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              [
                {
                  header: collegeItemNoteTypeNameWithAffiliation,
                  value: 'null',
                },
              ],
            );
          });

          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesToEdit,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              [
                {
                  header: collegeItemNoteTypeNameWithAffiliation,
                  value: null,
                },
              ],
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              headerValuesToEdit,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              [
                {
                  header: collegeItemNoteTypeNameWithAffiliation,
                  value: 'null',
                },
              ],
            );
          });

          BulkEditSearchPane.verifyErrorLabel(2);

          universityItemIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForTenantNotAssociatedError(id, Affiliations.University, 'note type'),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesToEdit,
            );
          });
          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              [
                {
                  header: collegeItemNoteTypeNameWithAffiliation,
                  value: null,
                },
              ],
            );
          });

          BulkEditActions.downloadErrors();

          universityItemIds.forEach((id) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${id},${getReasonForTenantNotAssociatedError(id, Affiliations.University, 'note type')}`,
            ]);
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote('-');
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              collegeItemNoteType.name,
              '-',
            );
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              'Yes',
              centralSharedItemNoteType.payload.name,
              '-',
            );
            ItemRecordView.checkCheckOutNote('-', 'No');
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote('-');
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              centralSharedItemNoteType.payload.name,
              '-',
            );
            ItemRecordView.checkItemNoteAbsent(collegeItemNoteType.name);
            ItemRecordView.checkCheckOutNote('-', 'No');
          });
        },
      );
    });
  });
});
