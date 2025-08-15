import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ItemNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  ITEM_NOTE_TYPES,
  LOAN_TYPE_NAMES,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

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
    name: `C478254 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeItemNoteType = {
  name: `C478254 College NoteType ${randomFourDigitNumber()}`,
};
const universityItemNoteType = {
  name: `C478254 University NoteType ${randomFourDigitNumber()}`,
};
const collegeItemNoteTypeNameWithAffiliation = `${collegeItemNoteType.name} (${Affiliations.College})`;
const universityItemNoteTypeNameWithAffiliation = `${universityItemNoteType.name} (${Affiliations.University})`;
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
                        { noteType: 'Check in', note: checkInNoteText, staffOnly: true },
                      ],
                    }).then((item) => {
                      collegeItemIds.push(item.id);
                    });
                    cy.wait(1000);
                  });
                });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              // create local item note type in University tenant
              ItemNoteTypes.createItemNoteTypeViaApi(universityItemNoteType.name)
                .then((noteId) => {
                  universityItemNoteType.id = noteId;
                })
                .then(() => {
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
                        {
                          itemNoteTypeId: universityItemNoteType.id,
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
            universityItemNoteTypeNameWithAffiliation,
          );
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

          BulkEditActions.openInAppStartBulkEditFrom();
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
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            universityItemNoteTypeNameWithAffiliation,
          );
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.changeNoteType(
            ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE,
            ITEM_NOTE_TYPES.CHECK_OUT_NOTE,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.changeNoteType(
            centralSharedItemNoteType.payload.name,
            universityItemNoteTypeNameWithAffiliation,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.changeNoteType(
            collegeItemNoteTypeNameWithAffiliation,
            ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.changeNoteType(
            ITEM_NOTE_TYPES.CHECK_IN_NOTE,
            ITEM_NOTE_TYPES.CHECK_OUT_NOTE,
            3,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const headerValuesToEditInCollege = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${checkInNoteText} (staff only) | ${administrativeNoteText}`,
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: '',
            },
            {
              header: universityItemNoteTypeNameWithAffiliation,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: collegeNoteText,
            },
          ];
          const headerValuesToEditInUniversity = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${checkInNoteText} (staff only) | ${administrativeNoteText}`,
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

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          const editedHederValueInCollege = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${checkInNoteText} (staff only) | ${administrativeNoteText}`,
            },
            {
              header: collegeItemNoteTypeNameWithAffiliation,
              value: '',
            },
            {
              header: centralSharedItemNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: collegeNoteText,
            },
          ];
          const editedHederValueInUniversity = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: `${checkInNoteText} (staff only) | ${administrativeNoteText}`,
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

          BulkEditSearchPane.verifyErrorLabel(4);

          collegeItemIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForTenantNotAssociatedError(id, Affiliations.College, 'note type'),
            );
          });
          universityItemIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForTenantNotAssociatedError(id, Affiliations.University, 'note type'),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              editedHederValueInCollege,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              editedHederValueInUniversity,
            );
          });

          BulkEditActions.downloadErrors();

          collegeItemIds.forEach((id) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${id},${getReasonForTenantNotAssociatedError(id, Affiliations.College, 'note type')}`,
            ]);
          });
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
            ItemRecordView.checkItemAdministrativeNote(collegeNoteText);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              centralSharedItemNoteType.payload.name,
              sharedNoteText,
            );
            ItemRecordView.checkCheckOutNote(`${checkInNoteText}${administrativeNoteText}`);
            ItemRecordView.checkStaffOnlyValueInLoanAccordion('YesNo');
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'YesNo',
              universityItemNoteType.name,
              `${sharedNoteText}${universityNoteText}`,
            );
            ItemRecordView.checkCheckOutNote(`${checkInNoteText}${administrativeNoteText}`);
            ItemRecordView.checkStaffOnlyValueInLoanAccordion('YesNo');
          });
        },
      );
    });
  });
});
